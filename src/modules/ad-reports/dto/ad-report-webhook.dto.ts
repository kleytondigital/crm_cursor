export interface AdReportWebhookPayload {
  tenantId: string;
  adAccountId: string; // act_123456789
  dateStart: string; // ISO date string
  dateEnd: string; // ISO date string
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
    date: string; // ISO date string
    messages: number;
    clicks: number;
    spend: number;
    impressions: number;
  }>;
  adsBreakdown: Array<{
    adId: string;
    name: string;
    spend: number;
    clicks: number;
    ctr: number;
    messages: number;
    cpm: number;
    cpc: number;
    cpa: number;
  }>;
}

