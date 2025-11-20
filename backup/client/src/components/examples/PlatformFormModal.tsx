import { useState } from "react";
import PlatformFormModal from "../PlatformFormModal";
import { Button } from "@/components/ui/button";

export default function PlatformFormModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>モーダルを開く</Button>
      <PlatformFormModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(platform) => {
          console.log("Platform submitted:", platform);
        }}
      />
    </div>
  );
}
