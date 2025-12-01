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

export interface ItemVariant {
  type: string;
  price: number;
  // 販売種別ごとの取り扱い開始月（YYYY-MM）
  startMonth?: string;
}

export interface Item {
  id: string;
  name: string;
  variants: ItemVariant[];
  archived?: boolean;
  // 商品全体の販売開始日
  startDate?: Date | null;
  // 販路ごとの設定（任意）
  platformSettings?: {
    platformId: string;
    feePercentage: number;
    shippingFee: number;
  }[];
}

interface ItemFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item;
  onSubmit: (item: Omit<Item, "id"> & { id?: string }) => void;
}

const sanitizeNumericInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return parts[0] + "." + parts.slice(1).join("");
};

const normalizeNumericValue = (value: string) => {
  if (!value) return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return String(num);
};

export default function ItemFormModal({ open, onOpenChange, item, onSubmit }: ItemFormModalProps) {
  const [name, setName] = useState("");
  const [variants, setVariants] = useState<ItemVariant[]>([{ type: "", price: 0 }]);
  const [archived, setArchived] = useState(false);
  const [startDateInput, setStartDateInput] = useState<string>("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setVariants(item.variants.length > 0 ? item.variants : [{ type: "", price: 0 }]);
      setArchived(Boolean(item.archived));
      if (item.startDate instanceof Date) {
        const y = item.startDate.getFullYear();
        const m = String(item.startDate.getMonth() + 1).padStart(2, "0");
        const d = String(item.startDate.getDate()).padStart(2, "0");
        setStartDateInput(`${y}-${m}-${d}`);
      } else {
        setStartDateInput("");
      }
    } else {
      setName("");
      setVariants([{ type: "", price: 0 }]);
      setArchived(false);
      setStartDateInput("");
    }
  }, [item, open]);

  const handleAddVariant = () => {
    setVariants([...variants, { type: "", price: 0 }]);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length > 1) {
      setVariants(variants.filter((_, i) => i !== index));
    }
  };

  const handleVariantChange = (index: number, field: keyof ItemVariant, value: string | number) => {
    const newVariants = [...variants];
    if (field === "type") {
      newVariants[index].type = value as string;
    } else if (field === "price") {
      newVariants[index].price = typeof value === "string" ? Number(value) : value;
    } else if (field === "startMonth") {
      newVariants[index].startMonth = value as string;
    }
    setVariants(newVariants);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDate =
      startDateInput && startDateInput.length >= 10 ? new Date(startDateInput) : null;
    onSubmit({
      id: item?.id,
      name,
      variants: variants.filter((v) => v.type && v.price > 0),
      archived,
      startDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "アイテム編集" : "アイテム追加"}</DialogTitle>
          <DialogDescription>
            販売するアイテムの情報を入力してください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">アイテム名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：イラスト集 Vol.1"
                required
                data-testid="input-item-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">販売開始日</Label>
              <Input
                id="startDate"
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-gray-300"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                取り扱い終了（新規の売上入力には表示しません）
              </Label>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>種類と価格 *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddVariant}
                  data-testid="button-add-variant"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  種類を追加
                </Button>
              </div>
              
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="space-y-2 border rounded-md p-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          value={variant.type}
                          onChange={(e) => handleVariantChange(index, "type", e.target.value)}
                          placeholder="例：紙、電子版"
                          required
                          data-testid={`input-variant-type-${index}`}
                        />
                      </div>
                      <div className="w-32">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={variant.price === 0 ? "" : String(variant.price)}
                          onChange={(e) => {
                            const v = sanitizeNumericInput(e.target.value);
                            const num = v === "" ? 0 : Number(v);
                            handleVariantChange(index, "price", Number.isFinite(num) ? num : 0);
                          }}
                          onBlur={(e) => {
                            const normalized = normalizeNumericValue(e.target.value);
                            const num = normalized === "" ? 0 : Number(normalized);
                            handleVariantChange(index, "price", Number.isFinite(num) ? num : 0);
                          }}
                          placeholder="価格"
                          required
                          data-testid={`input-variant-price-${index}`}
                        />
                      </div>
                      {variants.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveVariant(index)}
                          data-testid={`button-remove-variant-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`variant-start-month-${index}`} className="w-24 text-xs">
                        取り扱い開始月
                      </Label>
                      <Input
                        id={`variant-start-month-${index}`}
                        type="month"
                        className="h-8 text-sm"
                        value={variant.startMonth ?? ""}
                        onChange={(e) =>
                          handleVariantChange(index, "startMonth", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" data-testid="button-submit-item">
              {item ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
