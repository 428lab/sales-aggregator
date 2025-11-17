import { pgTable, text, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

//todo: この設計はPostgreSQL用です。Firebase Firestoreに移行する際は以下の構造を参考にしてください
//todo: 詳細は shared/database-schema.md を参照

// ============================================
// マスターテーブル
// ============================================

// 商品マスター
//todo: Firebase移行時は items コレクションとして実装
export const items = pgTable("items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // variants は JSON として保存（PostgreSQL）/ サブコレクションまたは配列フィールド（Firebase）
  variants: text("variants").notNull(), // JSON string: [{type: "紙版", basePrice: 1500, requiresShipping: true}]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;

// 販路マスター
//todo: Firebase移行時は platforms コレクションとして実装
export const platforms = pgTable("platforms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlatformSchema = createInsertSchema(platforms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type Platform = typeof platforms.$inferSelect;

// 決済方法マスター
//todo: Firebase移行時は paymentMethods コレクションとして実装
export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// ============================================
// 中間テーブル
// ============================================

// 商品×販路×決済方法の紐付け（手数料・送料を管理）
//todo: Firebase移行時は itemPlatformPayments コレクションとして実装
export const itemPlatformPayments = pgTable("item_platform_payments", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => items.id),
  platformId: text("platform_id").notNull().references(() => platforms.id),
  paymentMethodId: text("payment_method_id").notNull().references(() => paymentMethods.id),
  feePercentage: real("fee_percentage").notNull().default(0), // 決済手数料（%）
  shippingFee: integer("shipping_fee").notNull().default(0),  // 送料（円）
  enabled: boolean("enabled").notNull().default(true),        // 有効/無効
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertItemPlatformPaymentSchema = createInsertSchema(itemPlatformPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertItemPlatformPayment = z.infer<typeof insertItemPlatformPaymentSchema>;
export type ItemPlatformPayment = typeof itemPlatformPayments.$inferSelect;

// ============================================
// 販売記録テーブル
// ============================================

// 販売データ
//todo: Firebase移行時は sales コレクションとして実装
export const sales = pgTable("sales", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull().references(() => items.id),
  variantType: text("variant_type").notNull(),          // バリエーション種類（紙版/電子版）
  platformId: text("platform_id").notNull().references(() => platforms.id),
  paymentMethodId: text("payment_method_id").notNull().references(() => paymentMethods.id),
  quantity: integer("quantity").notNull(),
  basePrice: integer("base_price").notNull(),           // 販売時点の基本価格
  feePercentage: real("fee_percentage").notNull(),      // 販売時点の手数料%
  shippingFee: integer("shipping_fee").notNull(),       // 販売時点の送料
  totalAmount: integer("total_amount").notNull(),       // 合計金額
  saleDate: timestamp("sale_date").notNull(),           // 販売日時
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

// ============================================
// TypeScript型定義（フロントエンド用）
// ============================================

//todo: Firebase移行時の型定義
export interface ItemVariant {
  type: string;              // 種類（例：紙版、電子版）
  basePrice: number;         // 基本価格（円）
  requiresShipping: boolean; // 送料が必要か
}

export interface ItemWithVariants extends Omit<Item, 'variants'> {
  variants: ItemVariant[];
}

// 販売入力フォーム用の型
export interface SaleFormData {
  itemId: string;
  variantType: string;
  platformId: string;
  paymentMethodId: string;
  quantity: number;
  saleDate: Date;
}

// 販売計算結果
export interface SaleCalculation {
  basePrice: number;
  quantity: number;
  subtotal: number;          // basePrice * quantity
  fee: number;               // subtotal * feePercentage / 100
  shipping: number;          // shippingFee（requiresShipping=falseなら0）
  total: number;             // subtotal + fee + shipping
}
