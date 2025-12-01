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
import ItemFormModal, { type Item } from "@/components/ItemFormModal";
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

export default function ItemManagementPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    const fetchItems = async () => {
      setLoading(true);
      const itemsRef = collection(db, "items");
      const q = query(itemsRef, where("ownerUid", "==", user.uid));
      const snap = await getDocs(q);
      try {
        const fetched: Item[] = snap.docs
          .map((d) => {
            const data = d.data() as any;
            const createdAt = data.createdAt;
            const startDateRaw = data.startDate;
            let startDate: Date | null = null;
            if (startDateRaw?.toDate) {
              startDate = startDateRaw.toDate();
            } else if (startDateRaw instanceof Date) {
              startDate = startDateRaw;
            } else if (typeof startDateRaw === "string") {
              const parsed = new Date(startDateRaw);
              if (!Number.isNaN(parsed.getTime())) {
                startDate = parsed;
              }
            }
            return {
              id: d.id,
              name: data.name,
              variants: data.variants ?? [],
              archived: data.archived ?? false,
              createdAt,
              startDate,
            } as any;
          })
          .sort((a: any, b: any) => {
            // 取り扱い開始日の新しいものから並べる（降順）
            const getTime = (item: any) => {
              if (item.startDate instanceof Date && !Number.isNaN(item.startDate.getTime())) {
                return item.startDate.getTime();
              }
              const createdAt = item.createdAt;
              if (createdAt?.toDate) {
                const d = createdAt.toDate();
                return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
              }
              if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
                return createdAt.getTime();
              }
              return 0;
            };
            const aTime = getTime(a);
            const bTime = getTime(b);
            return bTime - aTime;
          })
          .map((item) => ({
            id: item.id,
            name: item.name,
            variants: item.variants,
            archived: item.archived ?? false,
            startDate: item.startDate ?? null,
          }));
        setItems(fetched);
      } finally {
        setLoading(false);
      }
    };
    fetchItems().catch((err) => {
      console.error("Failed to fetch items", err);
      toast({
        title: "読み込みに失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  }, [user, toast]);

  const handleAddItem = () => {
    setEditingItem(undefined);
    setModalOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (!user) return;
    const deleteAsync = async () => {
      const ref = doc(db, "items", id);
      await deleteDoc(ref);
      setItems(items.filter((item) => item.id !== id));
      toast({
        title: "削除完了",
        description: "アイテムを削除しました",
      });
    };
    deleteAsync().catch((err) => {
      console.error("Failed to delete item", err);
      toast({
        title: "削除に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  };

  const handleSubmit = (itemData: Omit<Item, "id"> & { id?: string }) => {
    if (!user) return;
    const saveAsync = async () => {
      if (itemData.id) {
        const ref = doc(db, "items", itemData.id);
        await updateDoc(ref, {
          name: itemData.name,
          variants: itemData.variants,
          archived: itemData.archived ?? false,
          startDate: itemData.startDate ?? null,
          updatedAt: serverTimestamp(),
        });
        setItems(
          items.map((item) =>
            item.id === itemData.id ? { ...itemData, id: itemData.id } : item,
          ),
        );
        toast({
          title: "更新完了",
          description: "アイテムを更新しました",
        });
      } else {
        const ref = await addDoc(collection(db, "items"), {
          ownerUid: user.uid,
          name: itemData.name,
          variants: itemData.variants,
          archived: itemData.archived ?? false,
          startDate: itemData.startDate ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        const newItem: Item = {
          ...itemData,
          id: ref.id,
        };
        setItems([newItem, ...items]);
        toast({
          title: "追加完了",
          description: "アイテムを追加しました",
        });
      }
    };
    saveAsync().catch((err) => {
      console.error("Failed to save item", err);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">アイテム管理</h1>
          <p className="text-muted-foreground">販売するアイテムを管理します</p>
        </div>
        <Button onClick={handleAddItem} data-testid="button-add-item">
          <Plus className="w-4 h-4 mr-2" />
          アイテム追加
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>アイテム一覧</CardTitle>
          <CardDescription>登録されているアイテムの一覧です</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>アイテム名</TableHead>
                  <TableHead>種類と価格</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium" data-testid={`text-item-name-${item.id}`}>
                    <div className="flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.archived && (
                        <Badge variant="outline" className="text-xs">
                          取り扱い終了
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {item.variants.map((variant, idx) => (
                        <Badge key={idx} variant="secondary" className="font-mono">
                          {variant.type}: ¥{variant.price.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditItem(item)}
                        data-testid={`button-edit-${item.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteItem(item.id)}
                        data-testid={`button-delete-${item.id}`}
                      >
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

      <ItemFormModal open={modalOpen} onOpenChange={setModalOpen} item={editingItem} onSubmit={handleSubmit} />
    </div>
  );
}



