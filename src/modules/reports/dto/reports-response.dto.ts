export interface ReportsOverviewResponseDto {
  totalLeads: number;
  totalConverted: number;
  conversionRate: number;
  totalAttendances: number;
  totalMessages: number;
  averageResponseTime: number; // em minutos
  averageAttendanceTime: number; // em minutos
}

export interface LeadsByPeriodDto {
  date: string;
  count: number;
  converted: number;
}

export interface ReportsLeadsResponseDto {
  total: number;
  byPeriod: LeadsByPeriodDto[]; // dia, semana ou mês
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  byOrigin: Array<{ origin: string; count: number; percentage: number }>;
}

export interface ConversionByAttendantDto {
  userId: string;
  userName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
}

export interface ReportsConversionResponseDto {
  overallRate: number;
  byAttendant: ConversionByAttendantDto[];
}

export interface AttendanceMetricsDto {
  userId: string;
  userName: string;
  totalAttendances: number;
  averageTime: number; // em minutos
  averageResponseTime: number; // em minutos
  conversionRate: number;
}

export interface ReportsAttendanceResponseDto {
  averageAttendanceTime: number;
  averageResponseTime: number;
  byAttendant: AttendanceMetricsDto[];
}

export interface CampaignMetricsDto {
  campaignId: string;
  campaignName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  dailyLeads: Array<{ date: string; count: number }>;
}

export interface ReportsCampaignsResponseDto {
  campaigns: CampaignMetricsDto[];
  comparison: Array<{ campaign: string; leads: number; converted: number; rate: number }>;
}

export interface JourneyStepDto {
  step: string;
  count: number;
  percentage: number;
}

export interface ReportsJourneyResponseDto {
  steps: JourneyStepDto[];
  flow: Array<{ from: string; to: string; count: number }>;
}

export interface ReportsMessagesResponseDto {
  total: number;
  manual: number;
  automatic: number;
  byPeriod: Array<{ date: string; manual: number; automatic: number }>;
}

export interface ScheduledMetricsDto {
  total: number;
  executed: number;
  failed: number;
  pending: number;
  byPeriod: Array<{ date: string; executed: number; failed: number }>;
}

export interface ReportsScheduledResponseDto {
  scheduled: ScheduledMetricsDto;
  errors: Array<{ date: string; count: number; messages: string[] }>;
}

