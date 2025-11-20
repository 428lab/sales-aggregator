import { useState } from "react";
import ItemFormModal from "../ItemFormModal";
import { Button } from "@/components/ui/button";

export default function ItemFormModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>モーダルを開く</Button>
      <ItemFormModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(item) => {
          console.log("Item submitted:", item);
        }}
      />
    </div>
  );
}
