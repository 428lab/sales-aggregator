import { useState } from "react";
import PaymentMethodFormModal from "../PaymentMethodFormModal";
import { Button } from "@/components/ui/button";

export default function PaymentMethodFormModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>モーダルを開く</Button>
      <PaymentMethodFormModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(method) => {
          console.log("Payment method submitted:", method);
        }}
      />
    </div>
  );
}
