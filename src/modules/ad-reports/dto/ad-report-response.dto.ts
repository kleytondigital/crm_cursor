export interface AdReportDashboardData {
  metrics: {
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    cpa: number;
    messages: number;
    costPerMessage: number;
    conversions: number;
    conversionRate: number;
  };
  timeline: Array<{
    date: string;
    spend: number;
    impressions: number;
    reach: number;
    clicks: number;
    messages: number;
    conversions: number;
  }>;
  funnel: {
    impressions: number;
    clicks: number;
    messages: number;
    conversions: number;
  };
  breakdown: Array<{
    adId: string;
    adName: string;
    creativeName?: string;
    spend: number;
    impressions: number;
    clicks: number;
    messages: number;
    cpc: number;
    cpm: number;
    ctr: number;
    cpa: number;
  }>;
}

