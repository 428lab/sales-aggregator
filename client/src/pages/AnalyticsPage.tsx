import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

//todo: remove mock functionality
const mockSalesData = [
  { month: "2024-01", sales: 145, revenue: 217500 },
  { month: "2024-02", sales: 189, revenue: 283500 },
  { month: "2024-03", sales: 234, revenue: 351000 },
];

const mockItemStats = [
  { name: "イラスト集 Vol.1（紙）", totalSales: 342, revenue: 513000, averagePrice: 1500 },
  { name: "イラスト集 Vol.1（電子版）", totalSales: 128, revenue: 128000, averagePrice: 1000 },
  { name: "アクリルキーホルダー（グッズ）", totalSales: 98, revenue: 78400, averagePrice: 800 },
];

const totalSales = mockItemStats.reduce((sum, item) => sum + item.totalSales, 0);
const totalRevenue = mockItemStats.reduce((sum, item) => sum + item.revenue, 0);
const totalItems = mockItemStats.length;

export default function AnalyticsPage() {
  return (
    <div className="p-8 space-y-6">
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
