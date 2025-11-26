import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  db,
  collection,
  getDocs,
  query,
  where,
} from "@/lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

interface SaleDoc {
  itemId: string;
  itemName?: string;
  variantType: string;
  quantity: number;
  totalAmount: number;
  saleDate: Date;
  month?: string;
}

interface ItemStatRow {
  name: string;
  totalSales: number;
  revenue: number;
  averagePrice: number;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<SaleDoc[]>([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // items count
      const itemsSnap = await getDocs(
        query(collection(db, "items"), where("ownerUid", "==", user.uid)),
      );
      setItemsCount(itemsSnap.size);

      // sales
      const salesSnap = await getDocs(
        query(collection(db, "sales"), where("ownerUid", "==", user.uid)),
      );
      const s: SaleDoc[] = salesSnap.docs.map((d) => {
        const data = d.data() as any;
        const saleDate: Date = data.saleDate instanceof Date ? data.saleDate : data.saleDate?.toDate?.() ?? new Date();
        return {
          itemId: data.itemId,
          itemName: data.itemName,
          variantType: data.variantType,
          quantity: data.quantity ?? 0,
          totalAmount: data.totalAmount ?? 0,
          saleDate,
          month: data.month,
        };
      });
      setSales(s);
      setLoading(false);
    };
    load().catch((err) => {
      console.error("Failed to load analytics data", err);
      setLoading(false);
    });
  }, [user]);

  const mockItemStats: ItemStatRow[] = useMemo(() => {
    const map = new Map<string, { totalSales: number; revenue: number; totalPrice: number }>();
    sales.forEach((s) => {
      const name = `${s.itemName ?? s.itemId}（${s.variantType}）`;
      const current = map.get(name) ?? { totalSales: 0, revenue: 0, totalPrice: 0 };
      current.totalSales += s.quantity;
      current.revenue += s.totalAmount;
      current.totalPrice += s.totalAmount; // ざっくり平均単価用
      map.set(name, current);
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      totalSales: v.totalSales,
      revenue: v.revenue,
      averagePrice: v.totalSales ? Math.round(v.totalPrice / v.totalSales) : 0,
    }));
  }, [sales]);

  const mockSalesData = useMemo(
    () => {
      const map = new Map<string, { sales: number; revenue: number }>();
      sales.forEach((s) => {
        const d = s.saleDate;
        const key = s.month ?? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const current = map.get(key) ?? { sales: 0, revenue: 0 };
        current.sales += s.quantity;
        current.revenue += s.totalAmount;
        map.set(key, current);
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([month, v]) => ({ month, sales: v.sales, revenue: v.revenue }));
    },
    [sales],
  );

  const totalSales = mockItemStats.reduce((sum, item) => sum + item.totalSales, 0);
  const totalRevenue = mockItemStats.reduce((sum, item) => sum + item.revenue, 0);
  const totalItems = itemsCount;

  return (
    <div className="relative p-8 space-y-6">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">読み込み中です…</span>
          </div>
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">売上集計</h1>
        <p className="text-muted-foreground">過去の累計販売数と金額を可視化します</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総販売数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sales">
              {totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">全アイテム合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ¥{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">手数料控除前</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録アイテム数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">販売中のアイテム</p>
          </CardContent>
        </Card>
      </div>

      <Card>
          <CardHeader>
          <CardTitle>月別売上推移</CardTitle>
          <CardDescription>過去3ヶ月の売上数と金額の推移</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={mockSalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="sales" fill="hsl(var(--chart-1))" name="販売数" />
              <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--chart-2))" name="売上 (円)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>アイテム別統計</CardTitle>
          <CardDescription>各アイテムの累計販売実績</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>アイテム名</TableHead>
                <TableHead className="text-right">販売数</TableHead>
                <TableHead className="text-right">売上金額</TableHead>
                <TableHead className="text-right">平均単価</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockItemStats.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right font-mono">{item.totalSales.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">¥{item.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">¥{item.averagePrice.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">合計</TableCell>
                <TableCell className="text-right font-bold font-mono">{totalSales.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold font-mono">¥{totalRevenue.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


