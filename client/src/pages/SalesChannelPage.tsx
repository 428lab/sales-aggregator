import { useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import PlatformFormModal, { type Platform } from "@/components/PlatformFormModal";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

//todo: remove mock functionality
const mockPlatforms: Platform[] = [
  { 
    id: "1", 
    name: "BOOTH", 
    description: "オンライン通販サイト",
    paymentMethods: [
      { name: "クレジットカード", feePercentage: 3.6, shippingFee: 0 },
      { name: "コンビニ決済", feePercentage: 2.5, shippingFee: 300 }
    ]
  },
  { 
    id: "2", 
    name: "イベント会場", 
    description: "対面販売",
    paymentMethods: [
      { name: "現金", feePercentage: 0, shippingFee: 0 },
      { name: "電子マネー", feePercentage: 2.0, shippingFee: 0 }
    ]
  },
];

export default function SalesChannelPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(mockPlatforms);
  const [platformModalOpen, setPlatformModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | undefined>();
  const { toast } = useToast();

  const handleAddPlatform = () => {
    setEditingPlatform(undefined);
    setPlatformModalOpen(true);
  };

  const handleEditPlatform = (platform: Platform) => {
    setEditingPlatform(platform);
    setPlatformModalOpen(true);
  };

  const handleDeletePlatform = (id: string) => {
    setPlatforms(platforms.filter((p) => p.id !== id));
    toast({ title: "削除完了", description: "販路を削除しました" });
  };

  const handleSubmitPlatform = (data: Omit<Platform, "id"> & { id?: string }) => {
    if (data.id) {
      setPlatforms(platforms.map((p) => (p.id === data.id ? { ...data, id: data.id } : p)));
      toast({ title: "更新完了", description: "販路を更新しました" });
    } else {
      setPlatforms([...platforms, { ...data, id: Date.now().toString() }]);
      toast({ title: "追加完了", description: "販路を追加しました" });
    }
  };


  return (
    <div className="p-8 space-y-6">
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
        onSubmit={handleSubmitPlatform}
      />
    </div>
  );
}
