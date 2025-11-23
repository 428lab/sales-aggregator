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

interface PlatformPayment {
  id: string;
  platformId: string;
  platformName: string;
  paymentName: string;
  feePercentage: number;
  shippingFee: number;
}

interface Platform {
  id: string;
  name: string;
}

interface SalesData {
  [key: string]: number; // key: "itemId-variantType-platformPaymentId"
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

const buildSalesKey = (itemId: string, variantType: string, platformPaymentId: string) => {
  return `${itemId}__${variantType}__${platformPaymentId}`;
};

export default function SalesInputPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformPayments, setPlatformPayments] = useState<PlatformPayment[]>([]);
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

      // platforms -> flatten payment combinations
      const platformsRef = collection(db, "platforms");
      const platformsSnap = await getDocs(query(platformsRef, where("ownerUid", "==", user.uid)));
      const pp: PlatformPayment[] = [];
      const loadedPlatforms: Platform[] = [];
      platformsSnap.forEach((d) => {
        const data = d.data() as any;
        const platformName: string = data.name;
        loadedPlatforms.push({
          id: d.id,
          name: platformName,
        });
        const paymentMethods: any[] = data.paymentMethods ?? [];
        paymentMethods.forEach((m, idx) => {
          pp.push({
            id: `${d.id}-${idx}`,
            platformId: d.id,
            platformName,
            paymentName: m.name,
            feePercentage: m.feePercentage ?? 0,
            shippingFee: m.shippingFee ?? 0,
          });
        });
      });
      setPlatforms(loadedPlatforms);
      setPlatformPayments(pp);
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
    if (!user || !selectedMonth || items.length === 0 || platformPayments.length === 0) return;

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
          const data = doc.data();
          // itemId, variantType, platformPaymentId を復元
          const itemId = data.itemId;
          const variantType = data.variantType;
          
          // platformName + paymentName から platformPaymentId を特定
          const pp = platformPayments.find(
            (p) => p.platformName === data.platformName && p.paymentName === data.paymentName
          );
          
          if (pp && itemId && variantType) {
            const key = buildSalesKey(itemId, variantType, pp.id);
            loadedData[key] = data.quantity || 0;
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
  }, [user, selectedMonth, items, platformPayments, toast]);

  const paymentsByPlatform = useMemo(() => {
    const map: Record<string, PlatformPayment[]> = {};
    platforms.forEach((p) => {
      map[p.id] = [];
    });
    platformPayments.forEach((pp) => {
      if (!map[pp.platformId]) {
        map[pp.platformId] = [];
      }
      map[pp.platformId].push(pp);
    });
    return map;
  }, [platforms, platformPayments]);

  const columnTotals = useMemo(() => {
    const totals: Record<
      string,
      {
        subtotal: number;
        charges: number;
        payout: number;
      }
    > = {};

    platformPayments.forEach((pp) => {
      totals[pp.id] = { subtotal: 0, charges: 0, payout: 0 };
    });

    items.forEach((item) => {
      item.variants.forEach((variant) => {
        platformPayments.forEach((pp) => {
          const key = buildSalesKey(item.id, variant.type, pp.id);
          const quantity = salesData[key] || 0;
          if (!quantity) return;
          const subtotal = variant.basePrice * quantity;

          const platformSetting =
            item.platformSettings?.find(
              (s) => s.platformId === pp.platformId && s.variantType === variant.type,
            ) ??
            item.platformSettings?.find(
              (s) => s.platformId === pp.platformId && !s.variantType,
            );

          const feeRate =
            platformSetting && typeof platformSetting.feePercentage === "number"
              ? platformSetting.feePercentage
              : pp.feePercentage;
          const shippingBase =
            platformSetting && typeof platformSetting.shippingFee === "number"
              ? platformSetting.shippingFee
              : pp.shippingFee;
          const fee = subtotal * (feeRate / 100);
          const shipping = variant.requiresShipping ? shippingBase : 0;
          const charges = fee + shipping;
          const payout = subtotal - charges;

          const current = totals[pp.id];
          if (!current) {
            totals[pp.id] = { subtotal, charges, payout };
          } else {
            current.subtotal += subtotal;
            current.charges += charges;
            current.payout += payout;
          }
        });
      });
    });

    return totals;
  }, [items, platformPayments, salesData]);

  const handleSalesChange = (itemId: string, variantType: string, platformPaymentId: string, value: string) => {
    const key = buildSalesKey(itemId, variantType, platformPaymentId);
    setSalesData({
      ...salesData,
      [key]: parseInt(value) || 0,
    });
  };

  const getSalesValue = (itemId: string, variantType: string, platformPaymentId: string) => {
    const key = buildSalesKey(itemId, variantType, platformPaymentId);
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

  const handleSave = () => {
    if (!user) return;
    const saveAsync = async () => {
      const [year, month] = selectedMonth.split("-");
      const saleDate = new Date(Number(year), Number(month) - 1, 1);

      const salesCollection = collection(db, "sales");
      const writes: Promise<any>[] = [];

      items
        .filter((item) => !item.archived)
        .forEach((item) => {
          item.variants.forEach((variant) => {
            platformPayments.forEach((pp) => {
              const quantity = getSalesValue(item.id, variant.type, pp.id);
              if (quantity > 0) {
                const subtotal = variant.basePrice * quantity;

                const platformSetting =
                  item.platformSettings?.find(
                    (s) => s.platformId === pp.platformId && s.variantType === variant.type,
                  ) ??
                  item.platformSettings?.find(
                    (s) => s.platformId === pp.platformId && !s.variantType,
                  );

                const feeRate =
                  platformSetting && typeof platformSetting.feePercentage === "number"
                    ? platformSetting.feePercentage
                    : pp.feePercentage;
                const shippingBase =
                  platformSetting && typeof platformSetting.shippingFee === "number"
                    ? platformSetting.shippingFee
                    : pp.shippingFee;

                const fee = subtotal * (feeRate / 100);
                const shipping = variant.requiresShipping ? shippingBase : 0;
                const totalAmount = subtotal + fee + shipping;

                writes.push(
                  addDoc(salesCollection, {
                    ownerUid: user.uid,
                    itemId: item.id,
                    itemName: item.name,
                    variantType: variant.type,
                    platformName: pp.platformName,
                    paymentName: pp.paymentName,
                    quantity,
                    basePrice: variant.basePrice,
                    feePercentage: pp.feePercentage,
                    shippingFee: pp.shippingFee,
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
    };

    saveAsync().catch((err) => {
      console.error("Failed to save sales", err);
      toast({
        title: "保存に失敗しました",
        description: "時間をおいて再度お試しください",
        variant: "destructive",
      });
    });
  };

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

      {platforms.length > 0 &&
        platformPayments.length > 0 &&
        items.some((item) => !item.archived) && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">売上数入力表</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th
                    rowSpan={2}
                    className="border-r border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50 align-bottom min-w-[120px]"
                  >
                    商品
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-gray-300 px-4 py-2 text-left font-semibold bg-gray-50 align-bottom"
                  >
                    種別
                  </th>
                  <th
                    rowSpan={2}
                    className="border-r border-gray-300 px-4 py-2 text-right font-semibold bg-gray-50 align-bottom min-w-[100px]"
                  >
                    単価
                  </th>
                  {platforms.map((platform) => {
                    const payments = paymentsByPlatform[platform.id] ?? [];
                    if (payments.length === 0) return null;
                    return (
                      <th
                        key={platform.id}
                        colSpan={payments.length}
                        className="border-r border-gray-300 px-4 py-2 text-center font-semibold bg-gray-50"
                      >
                        {platform.name}
                      </th>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-300">
                  {platforms.map((platform) => {
                    const payments = paymentsByPlatform[platform.id] ?? [];
                    return payments.map((pp, idx) => (
                      <th
                        key={pp.id}
                        className={`px-4 py-2 text-center font-medium bg-gray-50 text-xs min-w-[120px] ${
                          idx < payments.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                        }`}
                      >
                        <div>{pp.paymentName}</div>
                        <div className="text-xs text-gray-500 font-normal mt-1">
                          手数料 {pp.feePercentage}% / 送料 ¥{pp.shippingFee}
                        </div>
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((item) => !item.archived)
                  .flatMap((item) => {
                    return item.variants.map((variant, variantIdx) => (
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
                      {platforms.map((platform) => {
                        const payments = paymentsByPlatform[platform.id] ?? [];
                        return payments.map((pp, idx) => {
                          const quantity = getSalesValue(item.id, variant.type, pp.id);
                          return (
                            <td
                              key={pp.id}
                              className={`px-2 py-1 text-center ${
                                idx < payments.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                              }`}
                            >
                              <input
                                type="number"
                                min={0}
                                className="w-full px-2 py-1 text-center font-mono text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={quantity || ""}
                                onChange={(e) =>
                                  handleSalesChange(item.id, variant.type, pp.id, e.target.value)
                                }
                                placeholder=""
                                data-testid={`input-sales-${item.id}-${variant.type}-${pp.id}`}
                              />
                            </td>
                          );
                        });
                      })}
                    </tr>
                  ));
                })}
                <tr className="border-b border-gray-300 bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    小計
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform) => {
                    const payments = paymentsByPlatform[platform.id] ?? [];
                    return payments.map((pp, idx) => {
                      const totals = columnTotals[pp.id];
                      return (
                        <td
                          key={`${pp.id}-subtotal`}
                          className={`px-4 py-2 text-right font-mono text-sm ${
                            idx < payments.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                          }`}
                        >
                          {totals && totals.subtotal > 0
                            ? `¥${totals.subtotal.toLocaleString()}`
                            : ""}
                        </td>
                      );
                    });
                  })}
                </tr>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    送料・手数料
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform) => {
                    const payments = paymentsByPlatform[platform.id] ?? [];
                    return payments.map((pp, idx) => {
                      const totals = columnTotals[pp.id];
                      return (
                        <td
                          key={`${pp.id}-charges`}
                          className={`px-4 py-2 text-right font-mono text-sm ${
                            idx < payments.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                          }`}
                        >
                          {totals && totals.charges > 0
                            ? `¥${totals.charges.toLocaleString()}`
                            : ""}
                        </td>
                      );
                    });
                  })}
                </tr>
                <tr className="bg-gray-50">
                  <td className="border-r border-gray-300 px-4 py-2 font-semibold" colSpan={2}>
                    支払額
                  </td>
                  <td className="border-r border-gray-300 px-4 py-2" />
                  {platforms.map((platform) => {
                    const payments = paymentsByPlatform[platform.id] ?? [];
                    return payments.map((pp, idx) => {
                      const totals = columnTotals[pp.id];
                      return (
                        <td
                          key={`${pp.id}-payout`}
                          className={`px-4 py-2 text-right font-mono text-sm ${
                            idx < payments.length - 1 ? "border-r border-gray-200" : "border-r border-gray-300"
                          }`}
                        >
                          {totals && totals.payout !== 0
                            ? `¥${totals.payout.toLocaleString()}`
                            : ""}
                        </td>
                      );
                    });
                  })}
                </tr>
              </tbody>
            </table>
          </div>
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
