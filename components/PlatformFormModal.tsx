import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export interface PaymentMethod {
  name: string;
  feePercentage: number;
  shippingFee: number;
}

export interface PlatformItemVariantSetting {
  variantType: string;
  feePercentage: number;
  shippingFee: number;
}

export interface PlatformItemSetting {
  itemId: string;
  variants: PlatformItemVariantSetting[];
}

export interface Platform {
  id: string;
  name: string;
  description: string;
  paymentMethods: PaymentMethod[];
  itemSettings?: PlatformItemSetting[];
}

interface PlatformFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: Platform;
  // items: 販売可能なアイテム一覧（取り扱い終了は archived=true）
  items?: {
    id: string;
    name: string;
    archived?: boolean;
    variants?: { type: string; price: number }[];
  }[];
  onSubmit: (platform: Omit<Platform, "id"> & { id?: string }) => void;
}

export default function PlatformFormModal({
  open,
  onOpenChange,
  platform,
  items = [],
  onSubmit,
}: PlatformFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { name: "", feePercentage: 0, shippingFee: 0 },
  ]);
  const [itemSettings, setItemSettings] = useState<PlatformItemSetting[]>([]);
  const [newItemId, setNewItemId] = useState<string>("");

  useEffect(() => {
    if (platform) {
      setName(platform.name);
      setDescription(platform.description);
      setPaymentMethods(
        platform.paymentMethods.length > 0
          ? platform.paymentMethods
          : [{ name: "", feePercentage: 0, shippingFee: 0 }],
      );
      setItemSettings(platform.itemSettings ?? []);
    } else {
      setName("");
      setDescription("");
      setPaymentMethods([{ name: "", feePercentage: 0, shippingFee: 0 }]);
      setItemSettings([]);
    }
  }, [platform, open]);

  const handleAddPaymentMethod = () => {
    setPaymentMethods([...paymentMethods, { name: "", feePercentage: 0, shippingFee: 0 }]);
  };

  const handleRemovePaymentMethod = (index: number) => {
    if (paymentMethods.length > 1) {
      setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    }
  };

  const handlePaymentMethodChange = (index: number, field: keyof PaymentMethod, value: string | number) => {
    const newMethods = [...paymentMethods];
    if (field === "name") {
      newMethods[index].name = value as string;
    } else if (field === "feePercentage") {
      newMethods[index].feePercentage = typeof value === "string" ? Number(value) : value;
    } else if (field === "shippingFee") {
      newMethods[index].shippingFee = typeof value === "string" ? Number(value) : value;
    }
    setPaymentMethods(newMethods);
  };

  const handleAddItemSetting = () => {
    if (!newItemId) return;
    const item = items.find((it) => it.id === newItemId);
    const variantSettings: PlatformItemVariantSetting[] =
      item?.variants && item.variants.length > 0
        ? item.variants.map((v) => ({
            variantType: v.type,
            feePercentage: 0,
            shippingFee: 0,
          }))
        : [
            {
              variantType: "デフォルト",
              feePercentage: 0,
              shippingFee: 0,
            },
          ];

    setItemSettings([...itemSettings, { itemId: newItemId, variants: variantSettings }]);
    setNewItemId("");
  };

  const handleRemoveItemSetting = (index: number) => {
    setItemSettings(itemSettings.filter((_, i) => i !== index));
  };

  // 数値入力用：数字とドットのみ許可
  const sanitizeNumericInput = (value: string): string => {
    // 数字とドット以外を除去
    return value.replace(/[^0-9.]/g, "");
  };

  // blur時に正規化（先頭の0を除去、空なら0）
  const normalizeNumericValue = (value: string): number => {
    const sanitized = sanitizeNumericInput(value);
    if (sanitized === "" || sanitized === ".") return 0;
    const num = parseFloat(sanitized);
    return Number.isFinite(num) ? num : 0;
  };

  const handleItemVariantChange = (
    itemIndex: number,
    variantType: string,
    field: keyof PlatformItemVariantSetting,
    value: string | number,
  ) => {
    const next = [...itemSettings];
    const target = next[itemIndex];
    if (!target) return;
    const variant = target.variants.find((v) => v.variantType === variantType);
    if (!variant) return;

    const numValue = typeof value === "string" ? normalizeNumericValue(value) : value;

    if (field === "feePercentage") {
      variant.feePercentage = numValue;
    } else if (field === "shippingFee") {
      variant.shippingFee = numValue;
    }
    setItemSettings(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedItemSettings = itemSettings
      .filter((s) => s.itemId)
      .map((s) => ({
        ...s,
        variants: (s.variants ?? []).filter((v) => v.variantType),
      }));

    onSubmit({
      id: platform?.id,
      name,
      description,
      // 決済方法は現在はプラットフォーム側では管理しないため、既存値を維持する
      paymentMethods: platform?.paymentMethods ?? [],
      itemSettings: normalizedItemSettings,
    });
    onOpenChange(false);
  };

  const usedItemIds = itemSettings
    .map((s) => s.itemId)
    .filter((id): id is string => Boolean(id));

  const availableItemsForAdd = items.filter(
    (it) => !it.archived && !usedItemIds.includes(it.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{platform ? "販路編集" : "販路追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="name" className="whitespace-nowrap w-32">
                プラットフォーム名 *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：BOOTH"
                required
                className="flex-1"
                data-testid="input-platform-name"
              />
            </div>

            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap w-32">取り扱いアイテム</Label>
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newItemId}
                onChange={(e) => setNewItemId(e.target.value)}
              >
                <option value="">アイテムを選択</option>
                {availableItemsForAdd.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItemSetting}
                data-testid="button-add-platform-item"
                disabled={!newItemId}
              >
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </div>

            <div className="space-y-2">
              {itemSettings.map((setting, index) => {
                const item = items.find((it) => it.id === setting.itemId);
                return (
                  <div key={index} className="border rounded-md p-2 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {item?.name}
                        {item?.archived && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            （終了）
                          </span>
                        )}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleRemoveItemSetting(index)}
                        data-testid={`button-remove-platform-item-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left font-normal py-1 w-24">種類</th>
                          <th className="text-left font-normal py-1 w-20">価格</th>
                          <th className="text-left font-normal py-1 w-24">手数料%</th>
                          <th className="text-left font-normal py-1 w-24">送料</th>
                        </tr>
                      </thead>
                      <tbody>
                        {setting.variants.map((vs) => {
                          const variantInfo = item?.variants?.find(
                            (v) => v.type === vs.variantType,
                          );
                          return (
                            <tr key={vs.variantType}>
                                <td className="py-1 text-muted-foreground">
                                  {vs.variantType}
                                </td>
                                <td className="py-1 text-muted-foreground">
                                  ¥{(variantInfo?.price ?? 0).toLocaleString()}
                                </td>
                                <td className="py-1 pr-1">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={
                                      Number.isFinite(vs.feePercentage)
                                        ? String(vs.feePercentage)
                                        : "0"
                                    }
                                    onChange={(e) => {
                                      // 入力中は数字とドットのみ許可
                                      const sanitized = sanitizeNumericInput(e.target.value);
                                      const next = [...itemSettings];
                                      const target = next[index];
                                      if (target) {
                                        const variant = target.variants.find(
                                          (v) => v.variantType === vs.variantType,
                                        );
                                        if (variant) {
                                          // 一時的に文字列として保持（表示用）
                                          variant.feePercentage = sanitized === "" ? 0 : parseFloat(sanitized) || 0;
                                          setItemSettings(next);
                                        }
                                      }
                                    }}
                                    onBlur={(e) =>
                                      handleItemVariantChange(
                                        index,
                                        vs.variantType,
                                        "feePercentage",
                                        e.target.value,
                                      )
                                    }
                                    className="h-7 w-full text-xs px-2"
                                  />
                                </td>
                                <td className="py-1">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                      Number.isFinite(vs.shippingFee)
                                        ? String(vs.shippingFee)
                                        : "0"
                                    }
                                    onChange={(e) => {
                                      // 入力中は数字のみ許可（送料は整数）
                                      const sanitized = e.target.value.replace(/[^0-9]/g, "");
                                      const next = [...itemSettings];
                                      const target = next[index];
                                      if (target) {
                                        const variant = target.variants.find(
                                          (v) => v.variantType === vs.variantType,
                                        );
                                        if (variant) {
                                          variant.shippingFee = sanitized === "" ? 0 : parseInt(sanitized, 10) || 0;
                                          setItemSettings(next);
                                        }
                                      }
                                    }}
                                    onBlur={(e) =>
                                      handleItemVariantChange(
                                        index,
                                        vs.variantType,
                                        "shippingFee",
                                        e.target.value,
                                      )
                                    }
                                    className="h-7 w-full text-xs px-2"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" data-testid="button-submit-platform">
              {platform ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
