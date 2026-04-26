export interface IProduct {
  productId: string;
  productName: string;
  brand: string;
  category: string;
  subcategory: string;
  modelNumber: string;
  platform: 'Amazon' | 'eBay' | 'Walmart' | 'BestBuy';
  platformProductId: string;
  productUrl: string;
  imageUrl: string;
  isActive: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface IPriceSnapshot {
  snapshotId: string;
  productId: string;
  platform: string;
  scrapedAt: string;
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  inStock: boolean;
  stockLabel: string;
  sellerName?: string;
  sellerRating?: number;
  reviewCount: number;
  avgRating: number;
  shippingCost: number;
  isPrime?: boolean;
}
