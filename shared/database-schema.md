# データベーススキーマ設計

## 概要
Firebase Firestore を使用したマスター・中間テーブル設計

---

## マスターコレクション

### 1. items（商品マスター）
```typescript
//todo: Implement with Firebase Firestore
interface Item {
  id: string;                    // ドキュメントID
  name: string;                  // 商品名（例：同人誌A）
  variants: ItemVariant[];       // バリエーション（紙版、電子版など）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ItemVariant {
  type: string;                  // 種類（例：紙版、電子版）
  basePrice: number;             // 基本価格（円）
  requiresShipping: boolean;     // 送料が必要か（紙版=true、電子版=false）
}

// 例:
{
  id: "item001",
  name: "同人誌A",
  variants: [
    { type: "紙版", basePrice: 1500, requiresShipping: true },
    { type: "電子版", basePrice: 1000, requiresShipping: false }
  ]
}
```

### 2. platforms（販路マスター）
```typescript
//todo: Implement with Firebase Firestore
interface Platform {
  id: string;                    // ドキュメントID
  name: string;                  // 販路名（例：BOOTH、技術書典、現地販売）
  description: string;           // 説明
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 例:
{
  id: "platform001",
  name: "BOOTH",
  description: "オンライン通販サイト"
}
```

### 3. paymentMethods（決済方法マスター）
```typescript
//todo: Implement with Firebase Firestore
interface PaymentMethod {
  id: string;                    // ドキュメントID
  name: string;                  // 決済方法名（例：クレジットカード、現金）
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 例:
{
  id: "payment001",
  name: "クレジットカード"
}
```

---

## 中間テーブル（関連コレクション）

### 4. itemPlatformPayments（商品×販路×決済方法の紐付け）
この中間テーブルで、特定の商品が特定の販路で特定の決済方法を使える場合の
手数料や送料を管理します。

```typescript
//todo: Implement with Firebase Firestore
interface ItemPlatformPayment {
  id: string;                    // ドキュメントID
  itemId: string;                // 商品ID（items参照）
  platformId: string;            // 販路ID（platforms参照）
  paymentMethodId: string;       // 決済方法ID（paymentMethods参照）
  feePercentage: number;         // 決済手数料（%）
  shippingFee: number;           // 送料（円）※requiresShipping=falseの場合は0
  enabled: boolean;              // この組み合わせが有効か
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 例: 同人誌A × BOOTH × クレジットカード
{
  id: "ipp001",
  itemId: "item001",
  platformId: "platform001",     // BOOTH
  paymentMethodId: "payment001", // クレジットカード
  feePercentage: 3.6,
  shippingFee: 0,                // クレカなので送料0
  enabled: true
}

// 例: 同人誌A × BOOTH × コンビニ決済
{
  id: "ipp002",
  itemId: "item001",
  platformId: "platform001",     // BOOTH
  paymentMethodId: "payment002", // コンビニ決済
  feePercentage: 2.5,
  shippingFee: 300,              // コンビニ決済は送料300円
  enabled: true
}

// 例: 同人誌A × 現地販売 × 現金
{
  id: "ipp003",
  itemId: "item001",
  platformId: "platform003",     // 現地販売
  paymentMethodId: "payment003", // 現金
  feePercentage: 0,
  shippingFee: 0,                // 現地なので送料0
  enabled: true
}
```

---

## 販売記録コレクション

### 5. sales（販売データ）
```typescript
//todo: Implement with Firebase Firestore
interface Sale {
  id: string;                    // ドキュメントID
  itemId: string;                // 商品ID
  variantType: string;           // バリエーション種類（紙版/電子版）
  platformId: string;            // 販路ID
  paymentMethodId: string;       // 決済方法ID
  quantity: number;              // 販売数量
  basePrice: number;             // 基本価格（記録時点）
  feePercentage: number;         // 手数料%（記録時点）
  shippingFee: number;           // 送料（記録時点）
  totalAmount: number;           // 合計金額
  saleDate: Timestamp;           // 販売日時
  createdAt: Timestamp;
}

// 計算式:
// totalAmount = (basePrice * quantity) + (basePrice * quantity * feePercentage / 100) + (requiresShipping ? shippingFee : 0)
```

---

## Firestoreクエリ例

### 商品に紐づく利用可能な販路・決済方法を取得
```typescript
//todo: Implement query
const getAvailablePaymentOptions = async (itemId: string) => {
  const query = collection(db, 'itemPlatformPayments')
    .where('itemId', '==', itemId)
    .where('enabled', '==', true);
  
  const snapshot = await getDocs(query);
  return snapshot.docs.map(doc => doc.data());
};
```

### 販売入力時のドロップダウン選択肢
```typescript
//todo: Implement
// 1. 商品を選択 → itemsから取得
// 2. バリエーションを選択 → 選択した商品のvariantsから
// 3. 販路を選択 → itemPlatformPaymentsをフィルタして利用可能な販路を表示
// 4. 決済方法を選択 → 選択した販路で利用可能な決済方法を表示
// 5. 手数料・送料を自動計算 → itemPlatformPaymentsから取得
```

---

## 設計のメリット

1. **柔軟性**: 商品ごとに異なる販路・決済方法の組み合わせを設定可能
2. **保守性**: マスターデータと関連データが分離されている
3. **拡張性**: 新しい販路や決済方法を簡単に追加可能
4. **履歴管理**: 販売時点の価格・手数料を記録するため、後から変更しても影響なし

---

## 実装TODO

- [ ] Firebase Firestore の初期化
- [ ] マスターコレクションのCRUD実装
- [ ] itemPlatformPayments の管理画面実装
- [ ] 販売入力時の動的フィルタリング実装
- [ ] 料金計算ロジックの実装
