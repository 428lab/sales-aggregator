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
import ItemFormModal, { type Item } from "@/components/ItemFormModal";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

//todo: remove mock functionality
const mockItems: Item[] = [
  { 
    id: "1", 
    name: "イラスト集 Vol.1", 
    variants: [
      { type: "紙", price: 1500 },
      { type: "電子版", price: 1000 }
    ]
  },
  { 
    id: "2", 
    name: "アクリルキーホルダー", 
    variants: [
      { type: "グッズ", price: 800 }
    ]
  },
];

export default function ItemManagementPage() {
  const [items, setItems] = useState<Item[]>(mockItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | undefined>();
  const { toast } = useToast();

  const handleAddItem = () => {
    setEditingItem(undefined);
    setModalOpen(true);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    toast({
      title: "削除完了",
      description: "アイテムを削除しました",
    });
  };

  const handleSubmit = (itemData: Omit<Item, "id"> & { id?: string }) => {
    if (itemData.id) {
      setItems(items.map((item) => (item.id === itemData.id ? { ...itemData, id: itemData.id } : item)));
      toast({
        title: "更新完了",
        description: "アイテムを更新しました",
      });
    } else {
      const newItem: Item = {
        ...itemData,
        id: Date.now().toString(),
      };
      setItems([...items, newItem]);
      toast({
        title: "追加完了",
        description: "アイテムを追加しました",
      });
    }
  };

  return (
    <div className="p-8 space-y-6">
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
                    {item.name}
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
