import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import PlatformFormModal, { type Platform, type PlatformItemSetting } from "@/components/PlatformFormModal";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "@/lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function SalesChannelPage() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [items, setItems] = useState<
    {
      id: string;
      name: string;
      archived?: boolean;
      platformSettings?: any[];
      variants?: { type: string; price: number }[];
    }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const [platformSnap, itemSnap] = await Promise.all([
        getDocs(query(collection(db, "platforms"), where("ownerUid", "==", user.uid))),
        getDocs(query(collection(db, "items"), where("ownerUid", "==", user.uid))),
      ]);

      const fetchedPlatforms: Platform[] = platformSnap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name,
            description: data.description ?? "",
            paymentMethods: data.paymentMethods ?? [],
            createdAt: data.createdAt,
          } as any;
        })
        .sort((a: any, b: any) => {
          const aTime =
            a.createdAt?.toDate?.()?.getTime?.() ??
            (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
          const bTime =
            b.createdAt?.toDate?.()?.getTime?.() ??
            (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
          return bTime - aTime;
        })
        .map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          paymentMethods: p.paymentMethods,
        }));

      const fetchedItems = itemSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name,
          archived: data.archived ?? false,
          platformSettings: data.platformSettings ?? [],
          variants: data.variants ?? [],
        };
      });

      setPlatforms(fetchedPlatforms);
      setItems(fetchedItems);
      setLoading(false);
    };
    fetchAll().catch((err) => {
      console.error("Failed to fetch platforms or items", err);
      setLoading(false);
      toast({
        title: "読み込みに失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  }, [user, toast]);

  const handleAddPlatform = () => {
    setEditingPlatform(undefined);
    setPlatformModalOpen(true);
  };

  const handleEditPlatform = (platform: Platform) => {
    // アイテム側の設定から、この販路でのアイテム設定（バリエーションごと）を逆算
    const platformItemSettings: PlatformItemSetting[] = items
      .map((item) => {
        const settingsForPlatform = (item.platformSettings ?? []).filter(
          (s: any) => s.platformId === platform.id,
        );
        if (settingsForPlatform.length === 0) {
          return null;
        }

        const variants = (item.variants ?? []).map((v) => {
          const specific = settingsForPlatform.find((s: any) => s.variantType === v.type);
          const fallback = settingsForPlatform.find((s: any) => !s.variantType);
          const src = specific ?? fallback;
          return {
            variantType: v.type,
            feePercentage: src?.feePercentage ?? 0,
            shippingFee: src?.shippingFee ?? 0,
          };
        });

        if (variants.length === 0) return null;

        return {
          itemId: item.id,
          variants,
        };
      })
      .filter((x): x is PlatformItemSetting => Boolean(x));

    setEditingPlatform({
      ...platform,
      itemSettings: platformItemSettings,
    });
    setPlatformModalOpen(true);
  };

  const handleDeletePlatform = (id: string) => {
    if (!user) return;
    const deleteAsync = async () => {
      const ref = doc(db, "platforms", id);
      await deleteDoc(ref);
      setPlatforms(platforms.filter((p) => p.id !== id));
      toast({ title: "削除完了", description: "販路を削除しました" });
    };
    deleteAsync().catch((err) => {
      console.error("Failed to delete platform", err);
      toast({
        title: "削除に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  };

  const handleSubmitPlatform = (data: Omit<Platform, "id"> & { id?: string }) => {
    if (!user) return;
    const saveAsync = async () => {
      if (data.id) {
        const ref = doc(db, "platforms", data.id);
        await updateDoc(ref, {
          name: data.name,
          description: data.description ?? "",
          paymentMethods: data.paymentMethods,
          updatedAt: serverTimestamp(),
        });
        setPlatforms(platforms.map((p) => (p.id === data.id ? { ...data, id: data.id } : p)));

        // 販路×アイテム設定（バリエーションごと）を items コレクションに反映
        const itemSettingsById = new Map<string, PlatformItemSetting>();
        (data.itemSettings ?? []).forEach((s) => {
          itemSettingsById.set(s.itemId, s);
        });

        const itemUpdates = items.map(async (item) => {
          const currentSettings = item.platformSettings ?? [];
          const withoutPlatform = currentSettings.filter(
            (s: any) => s.platformId !== data.id,
          );
          const itemSetting = itemSettingsById.get(item.id);
          const nextSettings = itemSetting
            ? [
                ...withoutPlatform,
                ...(itemSetting.variants ?? []).map((vs) => ({
                  platformId: data.id!,
                  variantType: vs.variantType,
                  feePercentage: vs.feePercentage ?? 0,
                  shippingFee: vs.shippingFee ?? 0,
                })),
              ]
            : withoutPlatform;

          // 変更がなければスキップ
          const hasChanged =
            nextSettings.length !== currentSettings.length ||
            JSON.stringify(nextSettings) !== JSON.stringify(currentSettings);

          if (!hasChanged) return;

          await updateDoc(doc(db, "items", item.id), {
            platformSettings: nextSettings,
          });
        });

        await Promise.all(itemUpdates);

        // ローカル state も更新
        setItems((prev) =>
          prev.map((item) => {
            const currentSettings = item.platformSettings ?? [];
            const withoutPlatform = currentSettings.filter(
              (s: any) => s.platformId !== data.id,
            );
            const itemSetting = itemSettingsById.get(item.id);
            const nextSettings = itemSetting
              ? [
                  ...withoutPlatform,
                  ...(itemSetting.variants ?? []).map((vs) => ({
                    platformId: data.id!,
                    variantType: vs.variantType,
                    feePercentage: vs.feePercentage ?? 0,
                    shippingFee: vs.shippingFee ?? 0,
                  })),
                ]
              : withoutPlatform;

            return {
              ...item,
              platformSettings: nextSettings,
            };
          }),
        );
        toast({ title: "更新完了", description: "販路を更新しました" });
      } else {
        const ref = await addDoc(collection(db, "platforms"), {
          ownerUid: user.uid,
          name: data.name,
          description: data.description ?? "",
          paymentMethods: data.paymentMethods,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setPlatforms([{ ...data, id: ref.id }, ...platforms]);
        toast({ title: "追加完了", description: "販路を追加しました" });
      }
    };
    saveAsync().catch((err) => {
      console.error("Failed to save platform", err);
      toast({
        title: "保存に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  };


  return (
    <div className="relative p-8 space-y-6">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">読み込み中です…</span>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">販路管理</h1>
        <p className="text-muted-foreground">販売プラットフォームと決済方法を管理します</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleAddPlatform} data-testid="button-add-platform">
          <Plus className="w-4 h-4 mr-2" />
          販路追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>販路一覧</CardTitle>
          <CardDescription>登録されている販売プラットフォームと決済方法です</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>プラットフォーム名</TableHead>
                <TableHead>説明</TableHead>
                <TableHead>決済方法</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform) => (
                <TableRow key={platform.id}>
                  <TableCell className="font-medium">{platform.name}</TableCell>
                  <TableCell>{platform.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {platform.paymentMethods.map((method, idx) => (
                        <Badge key={idx} variant="secondary" className="font-mono text-xs">
                          {method.name}: {method.feePercentage}% / ¥{method.shippingFee}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEditPlatform(platform)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDeletePlatform(platform.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PlatformFormModal
        open={platformModalOpen}
        onOpenChange={setPlatformModalOpen}
        platform={editingPlatform}
        items={items}
        onSubmit={handleSubmitPlatform}
      />
    </div>
  );
}
