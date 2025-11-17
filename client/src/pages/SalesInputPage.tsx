import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

//todo: Replace with real data from Firebase
//todo: Fetch from items, platforms, paymentMethods, and itemPlatformPayments collections

// Mock: 商品マスター（バリエーション付き）
const mockItems = [
  {
    id: "item001",
    name: "同人誌A",
    variants: [
      { type: "紙版", basePrice: 1500, requiresShipping: true },
      { type: "電子版", basePrice: 1000, requiresShipping: false },
    ],
  },
  {
    id: "item002",
    name: "同人誌B",
    variants: [
      { type: "紙版", basePrice: 2000, requiresShipping: true },
      { type: "電子版", basePrice: 1500, requiresShipping: false },
    ],
  },
];

// Mock: 販路×決済方法の組み合わせ（itemPlatformPaymentsから取得想定）
//todo: Query itemPlatformPayments collection filtered by selected itemId and enabled=true
const mockPlatformPayments = [
  {
    id: "pp001",
    platformName: "BOOTH",
    paymentName: "クレジットカード",
    feePercentage: 3.6,
    shippingFee: 0,
  },
  {
    id: "pp002",
    platformName: "BOOTH",
    paymentName: "コンビニ決済",
    feePercentage: 2.5,
    shippingFee: 300,
  },
  {
    id: "pp003",
    platformName: "技術書典",
    paymentName: "クレジットカード",
    feePercentage: 2.0,
    shippingFee: 0,
  },
  {
    id: "pp004",
    platformName: "現地販売",
    paymentName: "現金",
    feePercentage: 0,
    shippingFee: 0,
  },
  {
    id: "pp005",
    platformName: "現地販売",
    paymentName: "電子マネー",
    feePercentage: 2.0,
    shippingFee: 0,
  },
];

interface SalesData {
  [key: string]: number; // key: "variantType-platformPaymentId"
}

export default function SalesInputPage() {
  const [selectedItemId, setSelectedItemId] = useState<string>(mockItems[0].id);
  const [selectedMonth, setSelectedMonth] = useState("2024-01");
  const [salesData, setSalesData] = useState<SalesData>({});
  const { toast } = useToast();

  const selectedItem = mockItems.find((item) => item.id === selectedItemId);

  const handleSalesChange = (variantType: string, platformPaymentId: string, value: string) => {
    const key = `${variantType}-${platformPaymentId}`;
    setSalesData({
      ...salesData,
      [key]: parseInt(value) || 0,
    });
  };

  const getSalesValue = (variantType: string, platformPaymentId: string) => {
    const key = `${variantType}-${platformPaymentId}`;
    return salesData[key] || 0;
  };

  const getVariantTotal = (variantType: string) => {
    return mockPlatformPayments.reduce((sum, pp) => {
      return sum + getSalesValue(variantType, pp.id);
    }, 0);
  };

  const getChannelTotal = (platformPaymentId: string) => {
    if (!selectedItem) return 0;
    return selectedItem.variants.reduce((sum, variant) => {
      return sum + getSalesValue(variant.type, platformPaymentId);
    }, 0);
  };

  const getGrandTotal = () => {
    if (!selectedItem) return 0;
    return selectedItem.variants.reduce((sum, variant) => {
      return sum + getVariantTotal(variant.type);
    }, 0);
  };

  //todo: Calculate total sales amount with fees and shipping
  const calculateTotalAmount = () => {
    if (!selectedItem) return 0;
    
    let total = 0;
    selectedItem.variants.forEach((variant) => {
      mockPlatformPayments.forEach((pp) => {
        const quantity = getSalesValue(variant.type, pp.id);
        if (quantity > 0) {
          const subtotal = variant.basePrice * quantity;
          const fee = subtotal * (pp.feePercentage / 100);
          const shipping = variant.requiresShipping ? pp.shippingFee : 0;
          total += subtotal + fee + shipping;
        }
      });
    });
    
    return total;
  };

  const handleSave = () => {
    //todo: Save to Firebase sales collection
    //todo: For each non-zero cell, create a sale document with:
    //  - itemId, variantType, platformId, paymentMethodId
    //  - quantity, basePrice, feePercentage, shippingFee
    //  - totalAmount (calculated), saleDate
    toast({
      title: "保存完了",
      description: `${selectedMonth}の売上データを保存しました`,
    });
    console.log("Sales data to save:", salesData);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">売上数入力</h1>
          <p className="text-muted-foreground">商品・販路・決済方法のマトリクスで売上数を入力します</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger className="w-full" data-testid="select-item">
              <SelectValue placeholder="商品を選択" />
            </SelectTrigger>
            <SelectContent>
              {mockItems.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full" data-testid="select-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024-01">2024年1月</SelectItem>
              <SelectItem value="2024-02">2024年2月</SelectItem>
              <SelectItem value="2024-03">2024年3月</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave} data-testid="button-save-sales">
          保存
        </Button>
      </div>

      {selectedItem && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>売上数入力表：{selectedItem.name}</CardTitle>
              <CardDescription>
                販路・決済方法ごとの売上数を入力してください（空欄は0として扱われます）
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-32">種別</TableHead>
                    {mockPlatformPayments.map((pp) => (
                      <TableHead key={pp.id} className="text-center min-w-40">
                        <div className="space-y-1">
                          <div className="font-semibold">{pp.platformName}</div>
                          <div className="text-xs text-muted-foreground">{pp.paymentName}</div>
                          <div className="text-xs">
                            <Badge variant="outline" className="font-mono text-xs">
                              {pp.feePercentage}% / ¥{pp.shippingFee}
                            </Badge>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-semibold">合計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItem.variants.map((variant) => (
                    <TableRow key={variant.type}>
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div>{variant.type}</div>
                          <div className="text-xs text-muted-foreground">
                            ¥{variant.basePrice.toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      {mockPlatformPayments.map((pp) => (
                        <TableCell key={pp.id}>
                          <Input
                            type="number"
                            min="0"
                            className="text-center font-mono"
                            value={getSalesValue(variant.type, pp.id) || ""}
                            onChange={(e) => handleSalesChange(variant.type, pp.id, e.target.value)}
                            placeholder="0"
                            data-testid={`input-sales-${variant.type}-${pp.id}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold font-mono">
                        {getVariantTotal(variant.type)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">合計</TableCell>
                    {mockPlatformPayments.map((pp) => (
                      <TableCell key={pp.id} className="text-center font-semibold font-mono">
                        {getChannelTotal(pp.id)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold font-mono">
                      {getGrandTotal()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>売上概要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">総販売数</div>
                  <div className="text-2xl font-bold font-mono">{getGrandTotal()}個</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">総売上金額（手数料・送料込）</div>
                  <div className="text-2xl font-bold font-mono">
                    ¥{calculateTotalAmount().toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
