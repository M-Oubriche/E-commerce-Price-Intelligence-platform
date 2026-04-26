export interface IDailyPriceSummary {
  productId: string;
  platform: string;
  date: string; // ISO Date
  openPrice: number;
  closePrice: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  changeVsYesterdayAbs: number;
  changeVsYesterdayPct: number;
}

export interface IProductMarketStats {
  productId: string;
  platform: string;
  computedAt: string;
  avgPrice30d: number;
  minPrice30d: number;
  maxPrice30d: number;
  allTimeLow: number;
  allTimeHigh: number;
  priceTrend7dPct: number;
  sparklineValues: number[];
  dropFromPeakPct: number;
}

export interface ILiveTickerFeed {
  productId: string;
  shortName: string;
  platform: string;
  currentPrice: number;
  previousClose: number;
  changePct: number;
  changeDirection: 'UP' | 'DOWN' | 'FLAT';
  refreshedAt: string;
  displayOrder: number;
}

export interface IHotDealToday {
  productId: string;
  productName: string;
  brand: string;
  emojiIcon: string;
  platform: string;
  currentPrice: number;
  referencePrice: number;
  dropAbs: number;
  dropPct: number;
  rank: number;
  computedAt: string;
}

export interface IMarketShare {
  computedDate: string;
  category: string;
  platform: string;
  listingCount: number;
  sharePct: number;
  avgPrice: number;
}

export interface ICategoryPriceIndex {
  month: string;
  category: string;
  priceIndex: number;
  avgPrice: number;
  momChangePct: number;
  trendDirection: 'UP' | 'DOWN' | 'FLAT';
}

export interface ICategoryAvgPrice {
  computedDate: string;
  category: string;
  avgPrice: number;
  medianPrice: number;
}

export interface IPlatformPriceComparison {
  computedDate: string;
  productId: string;
  productName: string;
  amazonPrice?: number;
  ebayPrice?: number;
  walmartPrice?: number;
  bestbuyPrice?: number;
  lowestPlatform: string;
  priceSpread: number;
}

export interface IStatisticalInsight {
  metric: string;
  method: 'T-TEST' | 'ANOVA' | 'REGRESSION';
  pValue: number;
  confidenceInterval: [number, number];
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  verdict: string;
}
