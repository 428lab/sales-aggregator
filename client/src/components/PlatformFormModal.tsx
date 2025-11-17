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

export interface Platform {
  id: string;
  name: string;
  description: string;
  paymentMethods: PaymentMethod[];
}

interface PlatformFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: Platform;
  onSubmit: (platform: Omit<Platform, "id"> & { id?: string }) => void;
}

export default function PlatformFormModal({
  open,
  onOpenChange,
  platform,
  onSubmit,
}: PlatformFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([{ name: "", feePercentage: 0, shippingFee: 0 }]);

  useEffect(() => {
    if (platform) {
      setName(platform.name);
      setDescription(platform.description);
      setPaymentMethods(platform.paymentMethods.length > 0 ? platform.paymentMethods : [{ name: "", feePercentage: 0, shippingFee: 0 }]);
    } else {
      setName("");
      setDescription("");
      setPaymentMethods([{ name: "", feePercentage: 0, shippingFee: 0 }]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: platform?.id,
      name,
      description,
      paymentMethods: paymentMethods.filter(m => m.name && m.feePercentage >= 0),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{platform ? "販路編集" : "販路追加"}</DialogTitle>
          <DialogDescription>
            販売プラットフォームの情報を入力してください
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">プラットフォーム名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：BOOTH"
                required
                data-testid="input-platform-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="オンライン通販サイト"
                data-testid="input-platform-description"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>決済方法 *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddPaymentMethod}
                  data-testid="button-add-payment-method"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  決済方法を追加
                </Button>
              </div>
              
              <div className="space-y-3">
                {paymentMethods.map((method, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <Input
                          value={method.name}
                          onChange={(e) => handlePaymentMethodChange(index, "name", e.target.value)}
                          placeholder="例：クレジットカード"
                          required
                          data-testid={`input-payment-name-${index}`}
                        />
                      </div>
                      {paymentMethods.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemovePaymentMethod(index)}
                          data-testid={`button-remove-payment-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={method.feePercentage || ""}
                          onChange={(e) => handlePaymentMethodChange(index, "feePercentage", e.target.value)}
                          placeholder="手数料 (%)"
                          required
                          data-testid={`input-payment-fee-${index}`}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={method.shippingFee || ""}
                          onChange={(e) => handlePaymentMethodChange(index, "shippingFee", e.target.value)}
                          placeholder="送料 (円)"
                          required
                          data-testid={`input-shipping-fee-${index}`}
                        />
                      </div>
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
            <Button type="submit" data-testid="button-submit-platform">
              {platform ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
