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

export interface PaymentMethod {
  id: string;
  name: string;
  feePercentage: number;
}

interface PaymentMethodFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod?: PaymentMethod;
  onSubmit: (method: Omit<PaymentMethod, "id"> & { id?: string }) => void;
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
  // 小数第2位以降は四捨五入して 0.1 単位に揃える
  const rounded = Math.round(num * 10) / 10;
  return String(rounded);
};

export default function PaymentMethodFormModal({
  open,
  onOpenChange,
  paymentMethod,
  onSubmit,
}: PaymentMethodFormModalProps) {
  const [name, setName] = useState("");
  const [feePercentage, setFeePercentage] = useState("");

  useEffect(() => {
    if (paymentMethod) {
      setName(paymentMethod.name);
      setFeePercentage(paymentMethod.feePercentage.toString());
    } else {
      setName("");
      setFeePercentage("");
    }
  }, [paymentMethod, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeNumericValue(feePercentage);
    onSubmit({
      id: paymentMethod?.id,
      name,
      feePercentage: normalized === "" ? 0 : Number(normalized),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{paymentMethod ? "決済方法編集" : "決済方法追加"}</DialogTitle>
          <DialogDescription>
            決済方法と手数料を入力してください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">決済方法 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：クレジットカード"
                required
                data-testid="input-payment-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">手数料 (%) *</Label>
              <Input
                id="fee"
                type="text"
                inputMode="decimal"
                value={feePercentage}
                onChange={(e) => setFeePercentage(sanitizeNumericInput(e.target.value))}
                onBlur={(e) => setFeePercentage(normalizeNumericValue(e.target.value))}
                placeholder="3.5"
                required
                data-testid="input-payment-fee"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" data-testid="button-submit-payment">
              {paymentMethod ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
