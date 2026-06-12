export interface DealAnalysisRow {
  product_unified_id: string;
  product_name: string;
  product_category: string;
  product_image_url: string | null;
  source: string;
  current_price: number | null;
  avg_price_30d: number | null;
  all_time_low_price: number | null;
  deal_score: number;
  is_fake_deal: boolean;
  discount_percent?: number;
  last_updated?: string;
  total_platforms_tracked?: number;
  platforms_in_stock?: number;
  avg_rating?: number;
  total_reviews?: number;
  total_platforms?: number;
  trending_score?: number;
  source_url?: string;
  in_stock?: boolean;
}

export interface PriceDropRow {
  product_unified_id: string;
  product_name: string;
  product_category: string;
  product_image_url: string | null;
  source: string;
  latest_date: string;
  latest_price: number;
  previous_price: number;
  absolute_drop_usd: number;
  drop_percentage: number;
  avg_rating?: number;
  total_reviews?: number;
  total_platforms?: number;
  platforms_in_stock?: number;
  last_updated?: string;
}

export interface CategoryTrendRow {
  product_category: string;
  product_count: number;
  mean_price: number;
  median_price: number;
  std_dev_price: number;
  min_price: number;
  max_price: number;
  category_avg_rating: number;
  category_avg_reviews: number;
}

export interface PlatformPerformanceRow {
  platform: string;
  catalog_size: number;
  avg_price: number;
  market_share_pct: number;
  visibility_score: number;
  competitiveness_score: number;
}

export interface MarketKpis {
  price_volatility_pct: number;
  total_market_items: number;
}

export interface PlatformCategoryAvgRow {
  product_category: string;
  platform: string;
  avg_price_usd: number;
  items_on_platform: number;
}


export interface ShopperInsightRow {
  product_category: string;
  interest_score: number;
  demand_trend: string;
  top_viewed_product_name: string;
}

export interface ProductCorrelationRow {
  factor_a: string;
  factor_b: string;
  correlation_coefficient: number;
}
