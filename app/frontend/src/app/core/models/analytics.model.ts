export interface IPricePoint {
  timestamp: string; // ISO Date
  value: number;
}

export interface IMarketInsight {
  id: string;
  metricName: string;
  currentValue: number;
  previousValue: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  percentageChange: number;
}

export interface IAnalytics {
  priceHistory: IPricePoint[];
  marketShare: { label: string; value: number }[];
  insights: IMarketInsight[];
}
