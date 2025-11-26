import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  db,
  collection,
  getDocs,
  addDoc,
  query,
  where,
} from "@/lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

interface ItemVariant {
  type: string;
  basePrice: number;
  requiresShipping: boolean;
}

interface Item {
  id: string;
  name: string;
  variants: ItemVariant[];
  archived?: boolean;
  platformSettings?: {
    platformId: string;
    variantType?: string;
    feePercentage: number;
    shippingFee: number;
  }[];
}

interface Platform {
  id: string;
  name: string;
}

interface SalesData {
  [key: string]: number; // key: "itemId-variantType-platformId"
}

const formatMonthValue = (year: number, month: number) => {
  return `${year}-${String(month).padStart(2, "0")}`;
};

const formatMonthLabel = (year: number, month: number) => {
  return `${year}年${month}月`;
};

const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return formatMonthValue(year, month);
};

const buildMonthOptions = () => {
  const startYear = 2020;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const options: { value: string; label: string }[] = [];

  for (let year = startYear; year <= currentYear; year++) {
    const lastMonth = year === currentYear ? currentMonth : 12;
    for (let month = 1; month <= lastMonth; month++) {
      options.push({
        value: formatMonthValue(year, month),
        label: formatMonthLabel(year, month),
      });
    }
  }

  // 新しい年月を上に出したいので降順にする
  return options.reverse();
};

const buildSalesKey = (itemId: string, variantType: string, platformId: string) => {
  return `${itemId}__${variantType}__${platformId}`;
};

export default function SalesInputPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthValue());
  const [yearInput, setYearInput] = useState<string>(() => getCurrentMonthValue().split("-")[0]);
  const [monthInput, setMonthInput] = useState<string>(() => getCurrentMonthValue().split("-")[1]);
  const [salesData, setSalesData] = useState<SalesData>({});
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const monthOptions = useMemo(() => buildMonthOptions(), []);

  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(monthOptions.map((o) => o.value.split("-")[0])));
    years.sort((a, b) => Number(b) - Number(a));
    return years;
  }, [monthOptions]);

  const monthOptionsForYear = useMemo(
    () =>
      monthOptions
        .filter((o) => o.value.startsWith(`${yearInput}-`))
        .map((o) => {
          const [, m] = o.value.split("-");
          return {
            value: m,
            label: `${Number(m)}月`,
          };
        }),
    [monthOptions, yearInput],
  );

  const selectedMonthLabel = useMemo(() => {
    const opt = monthOptions.find((o) => o.value === selectedMonth);
    return opt?.label ?? "";
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      // items
      const itemsRef = collection(db, "items");
      const itemsSnap = await getDocs(query(itemsRef, where("ownerUid", "==", user.uid)));
      const loadedItems: Item[] = itemsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name,
          archived: data.archived ?? false,
          platformSettings: data.platformSettings ?? [],
          variants: (data.variants ?? []).map((v: any) => ({
            type: v.type,
            basePrice: typeof v.price === "number" ? v.price : Number(v.basePrice ?? 0),
            requiresShipping: v.requiresShipping ?? true,
          })),
        };
      });
      setItems(loadedItems);

      // platforms
      const platformsRef = collection(db, "platforms");
      const platformsSnap = await getDocs(query(platformsRef, where("ownerUid", "==", user.uid)));
      const loadedPlatforms: Platform[] = [];
      platformsSnap.forEach((d) => {
        const data = d.data() as any;
        const platformName: string = data.name;
        loadedPlatforms.push({
          id: d.id,
          name: platformName,
        });
      });
      setPlatforms(loadedPlatforms);
      setLoading(false);
    };
    load().catch((err) => {
      console.error("Failed to load sales input data", err);
      setLoading(false);
      toast({
        title: "読み込みに失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  }, [user, toast]);

  // 選択中の年月の売上データを取得
  useEffect(() => {
    if (!user || !selectedMonth || items.length === 0 || platforms.length === 0) return;

    const loadSalesData = async () => {
      try {
        const salesRef = collection(db, "sales");
        const salesQuery = query(
          salesRef,
          where("ownerUid", "==", user.uid),
          where("month", "==", selectedMonth)
        );
        const salesSnap = await getDocs(salesQuery);

        const loadedData: SalesData = {};
        salesSnap.forEach((doc) => {
          const data = doc.data() as any;
          const itemId = data.itemId as string | undefined;
          const variantType = data.variantType as string | undefined;

          // 新仕様: platformId を優先して使用。なければ platformName から推定
          let platformId: string | undefined = data.platformId;
          if (!platformId && data.platformName) {
            const platform = platforms.find((p) => p.name === data.platformName);
            platformId = platform?.id;
          }

          if (platformId && itemId && variantType) {
            const key = buildSalesKey(itemId, variantType, platformId);
            loadedData[key] = (data.quantity as number) || 0;
          }
        });

        setSalesData(loadedData);
      } catch (err) {
        console.error("Failed to load sales data", err);
        toast({
          title: "売上データの読み込みに失敗しました",
          description: "時間をおいて再度お試しください",
          variant: "destructive",
        });
      }
    };

    loadSalesData();
  }, [user, selectedMonth, items, platforms, toast]);

  const columnTotals = useMemo(() => {
    const totals: Record<
      string,
      {
        subtotal: number;
        charges: number;
        payout: number;
      }
    > = {};

    platforms.forEach((platform) => {
      totals[platform.id] = { subtotal: 0, charges: 0, payout: 0 };
    });

    items.forEach((item) => {
      item.variants.forEach((variant) => {
        platforms.forEach((platform) => {
          const key = buildSalesKey(item.id, variant.type, platform.id);
          const quantity = salesData[key] || 0;
          if (!quantity) return;
          const subtotal = variant.basePrice * quantity;

          const platformSetting =
            item.platformSettings?.find(
              (s) => s.platformId === platform.id && s.variantType === variant.type,
            ) ??
            item.platformSettings?.find(
              (s) => s.platformId === platform.id && !s.variantType,
            );

          const feeRate =
            platformSetting && typeof platformSetting.feePercentage === "number"
              ? platformSetting.feePercentage
              : 0;
          const shippingBase =
            platformSetting && typeof platformSetting.shippingFee === "number"
              ? platformSetting.shippingFee
              : 0;

          const fee = subtotal * (feeRate / 100);
          const shipping = variant.requiresShipping ? shippingBase : 0;
          const charges = fee + shipping;
          const payout = subtotal - charges;

          const current = totals[platform.id];
          if (!current) {
            totals[platform.id] = { subtotal, charges, payout };
          } else {
            current.subtotal += subtotal;
            current.charges += charges;
            current.payout += payout;
          }
        });
      });
    });

    return totals;
  }, [items, platforms, salesData]);

  const handleSalesChange = (itemId: string, variantType: string, platformId: string, value: string) => {
    const key = buildSalesKey(itemId, variantType, platformId);
    setSalesData({
      ...salesData,
      [key]: parseInt(value) || 0,
    });
  };

  const getSalesValue = (itemId: string, variantType: string, platformId: string) => {
    const key = buildSalesKey(itemId, variantType, platformId);
    return salesData[key] || 0;
  };

  const handleApplyMonth = () => {
    if (!yearInput || !monthInput) return;
    const value = formatMonthValue(Number(yearInput), Number(monthInput));
    setSelectedMonth(value);
  };

  const handleYearChange = (year: string) => {
    setYearInput(year);
    const monthsForYear = monthOptions
      .filter((o) => o.value.startsWith(`${year}-`))
      .map((o) => o.value.split("-")[1]);
    if (monthsForYear.length > 0) {
      const maxMonth = monthsForYear.reduce((max, m) =>
        Number(m) > Number(max) ? m : max,
      monthsForYear[0]);
      setMonthInput(maxMonth);
    } else {
      setMonthInput("");
    }
  };

  async function handleSave() {
    if (!user) return;

    try {
      const [year, month] = selectedMonth.split("-");
      const saleDate = new Date(Number(year), Number(month) - 1, 1);

      const salesCollection = collection(db, "sales");
      const writes: Promise<any>[] = [];

      items
        .filter((item) => !item.archived)
        .forEach((item) => {
          item.variants.forEach((variant) => {
            platforms.forEach((platform) => {
              const quantity = getSalesValue(item.id, variant.type, platform.id);
              if (quantity > 0) {
                const subtotal = variant.basePrice * quantity;

                const platformSetting =
                  item.platformSettings?.find(
                    (s) => s.platformId === platform.id && s.variantType === variant.type,
                  ) ??
                  item.platformSettings?.find(
                    (s) => s.platformId === platform.id && !s.variantType,
                  );

                const feeRate =
                  platformSetting && typeof platformSetting.feePercentage === "number"
                    ? platformSetting.feePercentage
                    : 0;
                const shippingBase =
                  platformSetting && typeof platformSetting.shippingFee === "number"
                    ? platformSetting.shippingFee
                    : 0;

                const fee = subtotal * (feeRate / 100);
                const shipping = variant.requiresShipping ? shippingBase : 0;
                const totalAmount = subtotal + fee + shipping;

                writes.push(
                  addDoc(salesCollection, {
                    ownerUid: user.uid,
                    itemId: item.id,
                    itemName: item.name,
                    variantType: variant.type,
                    platformId: platform.id,
                    platformName: platform.name,
                    quantity,
                    basePrice: variant.basePrice,
                    feePercentage: feeRate,
                    shippingFee: shippingBase,
                    totalAmount,
                    saleDate,
                    month: selectedMonth,
                    createdAt: new Date(),
                  }),
                );
              }
            });
          });
        });

      await Promise.all(writes);

      toast({
        title: "保存完了",
        description: `${selectedMonth}の売上データを保存しました`,
      });
    } catch (err) {
      console.error("Failed to save sales", err);
      toast({
        title: "保存に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">売上数入力</h1>
          <p className="text-sm text-gray-600">
            販路と支払い種別ごとの売上数を、商品×種別のマトリクスで入力します（空欄は0として扱われます）
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-32">
            <Select value={yearInput} onValueChange={handleYearChange}>
              <SelectTrigger className="w-full" data-testid="select-year">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24">
            <Select value={monthInput} onValueChange={setMonthInput}>
              <SelectTrigger className="w-full" data-testid="select-month">
                <SelectValue placeholder="月" />
              </SelectTrigger>
              <SelectContent>
                {monthOptionsForYear.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Button type="button" onClick={handleApplyMonth}>
              表示
            </Button>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        表示中の年月: <span className="font-medium">{selectedMonthLabel}</span>
      </div>

      {platforms.length > 0 && items.some((item) => !item.archived) ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">売上数入力表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th
                    className="border-r border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50 align-bottom min-w-[120px]"
                  >
                    商品
                  </th>
                  <th
                    className="border-r border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50 align-bottom"
                  >
                    種別
                  </th>
                  <th
                    className="border-r border-gray-300 px-4 py-2 text-right font-semibold bg-gray-50 align-bottom min-w-[100px]"
                  >
                    単価
                  </th>
                  {platforms.map((platform, idx) => (
                    <th
                      key={platform.id}
                      className={`px-4 py-2 text-center font-semibold bg-gray-50 text-xs min-w-[120px] ${
                        idx < platforms.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                      }`}
                    >
                      {platform.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((item) => !item.archived)
                  .flatMap((item) =>
                    item.variants.map((variant, variantIdx) => (
                      <tr key={`${item.id}-${variant.type}`} className="border-b border-gray-200">
                        {variantIdx === 0 && (
                          <td
                            rowSpan={item.variants.length}
                            className="border-r border-gray-300 px-4 py-2 font-semibold align-top bg-gray-50"
                          >
                            {item.name}
                          </td>
                        )}
                        <td className="border-r border-gray-200 px-4 py-2 font-medium">
                          {variant.type}
                        </td>
                        <td className="border-r border-gray-300 px-4 py-2 text-right font-mono text-sm">
                          ¥{variant.basePrice.toLocaleString()}
                        </td>
                        {platforms.map((platform, idx) => {
                          const quantity = getSalesValue(item.id, variant.type, platform.id);
                          return (
                            <td
                              key={platform.id}
                              className={`px-2 py-1 text-center ${
                                idx < platforms.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                              }`}
                            >
                              <input
                                type="number"
                                min={0}
                                className="w-full px-2 py-1 text-center font-mono text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={quantity || ""}
                                onChange={(e) =>
                                  handleSalesChange(item.id, variant.type, platform.id, e.target.value)
                                }
                                placeholder=""
                                data-testid={`input-sales-${item.id}-${variant.type}-${platform.id}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  )}
                <tr className="border-b border-gray-300 bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    小計
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform, idx) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td
                        key={`${platform.id}-subtotal`}
                        className={`px-4 py-2 text-right font-mono text-sm ${
                          idx < platforms.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                        }`}
                      >
                        {totals && totals.subtotal > 0 ? `¥${totals.subtotal.toLocaleString()}` : ""}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    送料・手数料
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform, idx) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td
                        key={`${platform.id}-charges`}
                        className={`px-4 py-2 text-right font-mono text-sm ${
                          idx < platforms.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                        }`}
                      >
                        {totals && totals.charges > 0 ? `¥${totals.charges.toLocaleString()}` : ""}
                      </td>
                    );
                  })}
                </tr>
                <tr className="bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    支払額
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform, idx) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td
                        key={`${platform.id}-payout`}
                        className={`px-4 py-2 text-right font-mono text-sm ${
                          idx < platforms.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                        }`}
                      >
                        {totals && totals.payout !== 0 ? `¥${totals.payout.toLocaleString()}` : ""}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-600 bg-white/60">
          {platforms.length === 0 && (
            <p>販路がまだ登録されていません。「販路管理」から販路を追加してください。</p>
          )}
          {platforms.length > 0 && !items.some((item) => !item.archived) && (
            <p>取り扱い中のアイテムがありません。「アイテム管理」で新しいアイテムを追加してください。</p>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} data-testid="button-save-sales">
          保存
        </Button>
      </div>
    </div>
  );
}


