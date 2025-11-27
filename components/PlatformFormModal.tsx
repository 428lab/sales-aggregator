import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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
  description?: string;
  paymentMethods?: any[];
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

const sanitizeNumericInput = (value: string) => {
  // 数字と小数点以外を削除し、小数点は先頭の1つだけ許可
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join("");
};

const normalizeNumericValue = (value: string) => {
  if (!value) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  // 小数第2位以降は四捨五入して 0.1 単位に揃える
  const rounded = Math.round(num * 10) / 10;
  return String(rounded);
};

export default function PlatformFormModal({
  open,
  onOpenChange,
  platform,
  items = [],
  onSubmit,
}: PlatformFormModalProps) {
  const [name, setName] = useState("");
  const [itemSettings, setItemSettings] = useState<PlatformItemSetting[]>([]);
  const [newItemId, setNewItemId] = useState<string>("");

  useEffect(() => {
    if (platform) {
      setName(platform.name);
      setItemSettings(platform.itemSettings ?? []);
    } else {
      setName("");
      setItemSettings([]);
    }
  }, [platform, open]);

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

    if (field === "feePercentage") {
      variant.feePercentage = typeof value === "string" ? Number(value) : value;
    } else if (field === "shippingFee") {
      variant.shippingFee = typeof value === "string" ? Number(value) : value;
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

    const paymentMethods = platform?.paymentMethods ?? [];
    const description = platform?.description ?? "";

    onSubmit({
      id: platform?.id,
      name,
      description,
      paymentMethods,
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
      <DialogContent className="w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{platform ? "販路編集" : "販路追加"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* プラットフォーム名 行: ラベル左・入力右 */}
            <div className="flex items-center gap-4">
              <Label htmlFor="name" className="w-32 text-right">
                プラットフォーム名 *
              </Label>
              <Input
                id="name"
                className="flex-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：BOOTH"
                required
                data-testid="input-platform-name"
              />
            </div>

            {/* この販路で取り扱うアイテム 行 */}
            <div className="flex items-center gap-4">
              <Label className="w-32 text-right">この販路で取り扱うアイテム</Label>
              <div className="flex flex-1 items-center gap-2">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            </div>

            {/* アイテムごとの設定 */}
            <div className="space-y-2">
              <div className="space-y-3">
                {itemSettings.map((setting, index) => {
                  const item = items.find((it) => it.id === setting.itemId);
                  return (
                    <div key={index} className="space-y-2 border rounded-md p-3">
                      <div className="flex items-start">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">
                            {item?.name}
                            {item?.archived ? "（取り扱い終了）" : ""}
                          </Label>
                          {item?.variants && item.variants.length > 0 && (
                            <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                              {item.variants.map((v) => (
                                <span
                                  key={v.type}
                                  className="rounded border border-dashed px-2 py-0.5"
                                >
                                  {v.type}: ¥{(v.price ?? 0).toLocaleString()}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItemSetting(index)}
                          data-testid={`button-remove-platform-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="mt-2 space-y-1">
                        {setting.variants.map((vs) => (
                          <div key={vs.variantType} className="flex items-center gap-2">
                            <div className="w-28 text-xs text-muted-foreground">
                              {vs.variantType}
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                手数料（％）
                              </Label>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={
                                  Number.isFinite(vs.feePercentage)
                                    ? String(vs.feePercentage)
                                    : ""
                                }
                                onChange={(e) => {
                                  const v = sanitizeNumericInput(e.target.value);
                                  handleItemVariantChange(
                                    index,
                                    vs.variantType,
                                    "feePercentage",
                                    v,
                                  );
                                }}
                                onBlur={(e) => {
                                  const normalized = normalizeNumericValue(e.target.value);
                                  handleItemVariantChange(
                                    index,
                                    vs.variantType,
                                    "feePercentage",
                                    normalized,
                                  );
                                }}
                                placeholder="例：10"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <Label className="text-[11px] text-muted-foreground">
                                送料（円）
                              </Label>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={
                                  Number.isFinite(vs.shippingFee)
                                    ? String(vs.shippingFee)
                                    : ""
                                }
                                onChange={(e) => {
                                  const v = sanitizeNumericInput(e.target.value);
                                  handleItemVariantChange(
                                    index,
                                    vs.variantType,
                                    "shippingFee",
                                    v,
                                  );
                                }}
                                onBlur={(e) => {
                                  const normalized = normalizeNumericValue(e.target.value);
                                  handleItemVariantChange(
                                    index,
                                    vs.variantType,
                                    "shippingFee",
                                    normalized,
                                  );
                                }}
                                placeholder="例：100"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
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
