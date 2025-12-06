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
import { Input } from "@/components/ui/input";

interface SaleDoc {
  itemId: string;
  itemName?: string;
  variantType: string;
  quantity: number;
  basePrice: number;
  feePercentage: number;
  shippingFee: number;
  totalAmount: number;
  saleDate: Date;
  month?: string;
  subtotal: number;
  charges: number;
  payout: number;
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
  const [viewMode, setViewMode] = useState<"year" | "range">("year");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

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
        const quantity: number = data.quantity ?? 0;
        const basePrice: number = typeof data.basePrice === "number" ? data.basePrice : 0;
        const feePercentage: number = typeof data.feePercentage === "number" ? data.feePercentage : 0;
        const shippingFee: number = typeof data.shippingFee === "number" ? data.shippingFee : 0;
        const totalAmount: number = data.totalAmount ?? 0;

        const computedSubtotal = basePrice > 0 ? basePrice * quantity : totalAmount;
        const rawCharges = totalAmount - computedSubtotal;
        const computedCharges = rawCharges > 0 ? rawCharges : 0;
        const computedPayout = computedSubtotal - computedCharges;

        return {
          itemId: data.itemId,
          itemName: data.itemName,
          variantType: data.variantType,
          quantity,
          basePrice,
          feePercentage,
          shippingFee,
          totalAmount,
          saleDate,
          month: data.month,
          subtotal: computedSubtotal,
          charges: computedCharges,
          payout: computedPayout,
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

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(
        sales.map((s) => s.saleDate.getFullYear()).filter((y) => !Number.isNaN(y)),
      ),
    );
    years.sort((a, b) => b - a);
    return years;
  }, [sales]);

  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const filteredSales: SaleDoc[] = useMemo(() => {
    if (!sales.length) return [];

    if (viewMode === "year") {
      if (!selectedYear) return sales;
      return sales.filter(
        (s) => s.saleDate.getFullYear().toString() === selectedYear,
      );
    }

    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (rangeStart) {
      startDate = new Date(rangeStart);
    }
    if (rangeEnd) {
      const raw = new Date(rangeEnd);
      endDate = new Date(
        raw.getFullYear(),
        raw.getMonth(),
        raw.getDate(),
        23,
        59,
        59,
        999,
      );
    }

    return sales.filter((s) => {
      const t = s.saleDate.getTime();
      if (startDate && t < startDate.getTime()) return false;
      if (endDate && t > endDate.getTime()) return false;
      return true;
    });
  }, [sales, viewMode, selectedYear, rangeStart, rangeEnd]);

  const { rangeStartDate, rangeEndDate } = useMemo(() => {
    if (viewMode === "year") {
      if (selectedYear) {
        const y = Number(selectedYear);
        if (!Number.isNaN(y)) {
          return {
            rangeStartDate: new Date(y, 0, 1),
            rangeEndDate: new Date(y, 11, 31),
          };
        }
      }
    } else {
      if (rangeStart && rangeEnd) {
        const start = new Date(rangeStart);
        const rawEnd = new Date(rangeEnd);
        const end = new Date(
          rawEnd.getFullYear(),
          rawEnd.getMonth(),
          rawEnd.getDate(),
          23,
          59,
          59,
          999,
        );
        return { rangeStartDate: start, rangeEndDate: end };
      }
    }

    if (!filteredSales.length) {
      return { rangeStartDate: undefined, rangeEndDate: undefined } as {
        rangeStartDate: Date | undefined;
        rangeEndDate: Date | undefined;
      };
    }

    const sorted = [...filteredSales].sort(
      (a, b) => a.saleDate.getTime() - b.saleDate.getTime(),
    );
    return {
      rangeStartDate: sorted[0].saleDate,
      rangeEndDate: sorted[sorted.length - 1].saleDate,
    };
  }, [viewMode, selectedYear, rangeStart, rangeEnd, filteredSales]);

  const buildMonthKeys = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return [] as string[];

    const keys: string[] = [];
    const current = new Date(
      rangeStartDate.getFullYear(),
      rangeStartDate.getMonth(),
      1,
    );
    const last = new Date(
      rangeEndDate.getFullYear(),
      rangeEndDate.getMonth(),
      1,
    );

    while (current <= last) {
      const key = `${current.getFullYear()}-${String(
        current.getMonth() + 1,
      ).padStart(2, "0")}`;
      keys.push(key);
      current.setMonth(current.getMonth() + 1);
    }

    return keys;
  }, [rangeStartDate, rangeEndDate]);

  const mockItemStats: ItemStatRow[] = useMemo(() => {
    const map = new Map<string, { totalSales: number; revenue: number; totalPrice: number }>();
    filteredSales.forEach((s) => {
      const name = `${s.itemName ?? s.itemId}（${s.variantType}）`;
      const current = map.get(name) ?? { totalSales: 0, revenue: 0, totalPrice: 0 };
      current.totalSales += s.quantity;
      current.revenue += s.subtotal;
      current.totalPrice += s.subtotal;
      map.set(name, current);
    });
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      totalSales: v.totalSales,
      revenue: v.revenue,
      averagePrice: v.totalSales ? Math.round(v.totalPrice / v.totalSales) : 0,
    }));
  }, [filteredSales]);

  const mockSalesData = useMemo(
    () => {
      const map = new Map<string, { sales: number; revenue: number }>();
      filteredSales.forEach((s) => {
        const d = s.saleDate;
        const key = s.month ?? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const current = map.get(key) ?? { sales: 0, revenue: 0 };
        current.sales += s.quantity;
        current.revenue += s.payout;
        map.set(key, current);
      });

      if (!buildMonthKeys.length) {
        return Array.from(map.entries())
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([month, v]) => ({ month, sales: v.sales, revenue: v.revenue }));
      }

      return buildMonthKeys.map((key) => {
        const v = map.get(key) ?? { sales: 0, revenue: 0 };
        return { month: key, sales: v.sales, revenue: v.revenue };
      });
    },
    [filteredSales, buildMonthKeys],
  );

  const totalSales = mockItemStats.reduce((sum, item) => sum + item.totalSales, 0);
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.subtotal, 0);
  const totalCharges = filteredSales.reduce((sum, s) => sum + s.charges, 0);
  const totalPayout = filteredSales.reduce((sum, s) => sum + s.payout, 0);
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
        <p className="text-muted-foreground">期間を指定して売上・経費・実収入を可視化します</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">表示期間</CardTitle>
          <CardDescription>
            年単位または任意の期間で集計対象を切り替えできます
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
              <button
                type="button"
                onClick={() => setViewMode("year")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === "year"
                    ? "bg-background text-foreground shadow-sm"
                    : ""
                }`}
              >
                年間
              </button>
              <button
                type="button"
                onClick={() => setViewMode("range")}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                  viewMode === "range"
                    ? "bg-background text-foreground shadow-sm"
                    : ""
                }`}
              >
                任意期間
              </button>
            </div>

            {viewMode === "year" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">年を選択</span>
                <select
                  className="h-8 rounded-md border bg-background px-2 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}年
                    </option>
                  ))}
                </select>
              </div>
            )}

            {viewMode === "range" && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">開始日</span>
                <Input
                  type="date"
                  className="h-8 w-40"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">終了日</span>
                <Input
                  type="date"
                  className="h-8 w-40"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium">売上合計（小計）</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ¥{totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">単価×数量の合計（手数料・送料含まず）</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">実収入合計</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{totalPayout.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">手数料・送料控除後</p>
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
          <CardTitle>月別推移</CardTitle>
          <CardDescription>選択した期間内の販売数と実収入の推移</CardDescription>
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
              <Bar yAxisId="right" dataKey="revenue" fill="hsl(var(--chart-2))" name="実収入 (円)" />
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



