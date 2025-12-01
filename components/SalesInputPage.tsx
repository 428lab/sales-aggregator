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
  // この販売種別の取り扱い開始月（YYYY-MM）
  startMonth?: string;
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
  // 商品全体の販売開始月（startDate から算出）
  startMonth?: string;
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
        // 商品レベルの販売開始日から YYYY-MM を算出
        let itemStartMonth: string | undefined;
        const startDateRaw = data.startDate;
        if (startDateRaw?.toDate) {
          const dt = startDateRaw.toDate();
          itemStartMonth = formatMonthValue(dt.getFullYear(), dt.getMonth() + 1);
        } else if (startDateRaw instanceof Date) {
          itemStartMonth = formatMonthValue(startDateRaw.getFullYear(), startDateRaw.getMonth() + 1);
        } else if (typeof startDateRaw === "string" && /^\d{4}-\d{2}/.test(startDateRaw)) {
          itemStartMonth = startDateRaw.slice(0, 7);
        }

        return {
          id: d.id,
          name: data.name,
          archived: data.archived ?? false,
          platformSettings: data.platformSettings ?? [],
          variants: (data.variants ?? []).map((v: any) => ({
            type: v.type,
            basePrice: typeof v.price === "number" ? v.price : Number(v.basePrice ?? 0),
            requiresShipping: v.requiresShipping ?? true,
            startMonth: v.startMonth ?? itemStartMonth,
          })),
          startMonth: itemStartMonth,
        };
      });
      // アイテムは取り扱い開始の新しいものから（降順）
      loadedItems.sort((a, b) => {
        const aKey = a.startMonth ?? "0000-00";
        const bKey = b.startMonth ?? "0000-00";
        if (aKey === bKey) {
          return a.name.localeCompare(b.name);
        }
        return bKey.localeCompare(aKey);
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

  // この販路でこのバリエーションが取り扱い対象かどうか
  const isVariantEnabledOnPlatform = (item: Item, variantType: string, platformId: string) => {
    const settings = item.platformSettings ?? [];
    return settings.some(
      (s) => s.platformId === platformId && (!s.variantType || s.variantType === variantType),
    );
  };

  // 選択中の月において、この販売種別が表示対象かどうか
  const isVariantActiveInMonth = (item: Item, variant: ItemVariant, month: string) => {
    const effectiveStart = variant.startMonth ?? item.startMonth;
    if (!effectiveStart || effectiveStart.length < 7) return true;
    // "YYYY-MM" 形式同士なので文字列比較で大小判定可能
    return month >= effectiveStart;
  };

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
          // この販路で取り扱っていない組み合わせは集計対象外
          if (!isVariantEnabledOnPlatform(item, variant.type, platform.id)) return;

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
          // 送料は「単品ごと」に発生する前提のため、数量分を掛ける
          const shipping = variant.requiresShipping ? shippingBase * quantity : 0;
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
              // この販路で取り扱っていない組み合わせは保存しない
              if (!isVariantEnabledOnPlatform(item, variant.type, platform.id)) return;

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
                // 送料は「単品ごと」に発生する前提のため、数量分を掛ける
                const shipping = variant.requiresShipping ? shippingBase * quantity : 0;
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

  // 合計金額を計算
  const grandTotal = useMemo(() => {
    let subtotal = 0;
    let charges = 0;
    let payout = 0;
    Object.values(columnTotals).forEach((t) => {
      subtotal += t.subtotal;
      charges += t.charges;
      payout += t.payout;
    });
    return { subtotal, charges, payout };
  }, [columnTotals]);

  return (
    <div className="relative p-6 space-y-5">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">読み込み中です…</span>
          </div>
        </div>
      )}

      {/* ヘッダー＋年月選択を1行に */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">売上入力</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            販路ごとの売上数量を入力
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={yearInput} onValueChange={handleYearChange}>
            <SelectTrigger className="w-40 h-8 text-sm" data-testid="select-year">
              <SelectValue placeholder="年" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year} className="text-sm">
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthInput} onValueChange={setMonthInput}>
            <SelectTrigger className="w-20 h-8 text-sm" data-testid="select-month">
              <SelectValue placeholder="月" />
            </SelectTrigger>
            <SelectContent>
              {monthOptionsForYear.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" onClick={handleApplyMonth}>
            表示
          </Button>
        </div>
      </div>

      {/* サマリー（コンパクト版） */}
      {platforms.length > 0 && items.some((item) => !item.archived) && grandTotal.subtotal > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">売上:</span>
            <span className="font-mono font-semibold text-gray-900">¥{grandTotal.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">経費:</span>
            <span className="font-mono font-semibold text-red-600">-¥{grandTotal.charges.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">実収入:</span>
            <span className="font-mono font-bold text-green-600">¥{grandTotal.payout.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* メインテーブル */}
      {platforms.length > 0 && items.some((item) => !item.archived) ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700 min-w-[100px] border-r border-gray-200">
                    商品
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[70px] border-r border-gray-200">
                    種別
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700 min-w-[70px] border-r border-gray-200">
                    単価
                  </th>
                  {platforms.map((platform) => (
                    <th
                      key={platform.id}
                      className="px-3 py-2 text-center font-medium text-gray-700 min-w-[80px] border-r border-gray-100 last:border-r-0"
                    >
                      {platform.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items
                  .filter((item) => !item.archived)
                  .flatMap((item, itemIdx) => {
                    const activeVariants = item.variants
                      .filter((variant) => isVariantActiveInMonth(item, variant, selectedMonth))
                      // 販売種別は取り扱い開始の古いものから（昇順）
                      .sort((a, b) => {
                        const aKey = a.startMonth ?? item.startMonth ?? "9999-99";
                        const bKey = b.startMonth ?? item.startMonth ?? "9999-99";
                        if (aKey === bKey) {
                          return a.type.localeCompare(b.type);
                        }
                        return aKey.localeCompare(bKey);
                      });
                    if (activeVariants.length === 0) return [];
                    return activeVariants.map((variant, variantIdx) => (
                      <tr
                        key={`${item.id}-${variant.type}`}
                        className={`border-b border-gray-100 ${itemIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        {variantIdx === 0 && (
                          <td
                            rowSpan={activeVariants.length}
                            className="sticky left-0 z-10 px-3 py-1.5 font-medium text-gray-900 align-top border-r border-gray-200"
                            style={{ backgroundColor: itemIdx % 2 === 0 ? "white" : "rgb(249 250 251 / 0.5)" }}
                          >
                            {item.name}
                          </td>
                        )}
                        <td className="px-3 py-1.5 text-gray-600 border-r border-gray-200">
                          {variant.type}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-gray-600 border-r border-gray-200">
                          ¥{variant.basePrice.toLocaleString()}
                        </td>
                        {platforms.map((platform) => {
                          const enabled = isVariantEnabledOnPlatform(item, variant.type, platform.id);
                          const quantity = enabled ? getSalesValue(item.id, variant.type, platform.id) : 0;
                          return (
                            <td
                              key={platform.id}
                              className={`px-1.5 py-1.5 text-center border-r border-gray-100 last:border-r-0 ${
                                !enabled ? "bg-gray-100" : ""
                              }`}
                            >
                              {enabled ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  className="w-full px-2 py-1.5 text-center font-mono text-sm
                                    bg-white border border-gray-300 rounded-md
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500
                                    hover:border-gray-400 shadow-xs transition-colors
                                    placeholder:text-gray-300"
                                  value={quantity || ""}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, "");
                                    handleSalesChange(item.id, variant.type, platform.id, val);
                                  }}
                                  placeholder="0"
                                  data-testid={`input-sales-${item.id}-${variant.type}-${platform.id}`}
                                />
                              ) : (
                                <span className="inline-flex items-center justify-center w-full text-[11px] text-gray-400">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-medium text-gray-700 border-r border-gray-200" colSpan={2}>
                    小計
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200" />
                  {platforms.map((platform) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td key={`${platform.id}-subtotal`} className="px-3 py-2 text-right font-mono text-gray-900 border-r border-gray-100 last:border-r-0">
                        {totals && totals.subtotal > 0 ? `¥${totals.subtotal.toLocaleString()}` : "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-medium text-gray-700 border-r border-gray-200" colSpan={2}>
                    経費
                  </td>
                  <td className="px-3 py-2 border-r border-gray-200" />
                  {platforms.map((platform) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td key={`${platform.id}-charges`} className="px-3 py-2 text-right font-mono text-red-600 border-r border-gray-100 last:border-r-0">
                        {totals && totals.charges > 0 ? `-¥${totals.charges.toLocaleString()}` : "-"}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-100 px-3 py-2 font-semibold text-gray-900 border-r border-gray-200" colSpan={2}>
                    実収入
                  </td>
                  <td className="px-3 py-2 bg-gray-100 border-r border-gray-200" />
                  {platforms.map((platform) => {
                    const totals = columnTotals[platform.id];
                    return (
                      <td key={`${platform.id}-payout`} className="px-3 py-2 text-right font-mono font-semibold text-green-600 bg-gray-100 border-r border-gray-100 last:border-r-0">
                        {totals && totals.payout !== 0 ? `¥${totals.payout.toLocaleString()}` : "-"}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
          {platforms.length === 0 ? (
            <>
              <p className="text-gray-600 font-medium">販路が登録されていません</p>
              <p className="text-gray-500 text-sm mt-1">「販路管理」から販路を追加してください</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 font-medium">取り扱いアイテムがありません</p>
              <p className="text-gray-500 text-sm mt-1">「アイテム管理」でアイテムを追加してください</p>
            </>
          )}
        </div>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-sales">
          保存
        </Button>
      </div>
    </div>
  );
}
