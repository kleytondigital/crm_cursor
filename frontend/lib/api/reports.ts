import { apiRequest } from './api'

export interface ReportsFilter {
  startDate?: string
  endDate?: string
  userId?: string
  campaignId?: string
  origin?: string
  status?: string[]
  converted?: boolean
  period?: 'day' | 'week' | 'month'
}

export interface ReportsOverview {
  totalLeads: number
  totalConverted: number
  conversionRate: number
  totalAttendances: number
  totalMessages: number
  averageResponseTime: number
  averageAttendanceTime: number
}

export interface LeadsByPeriod {
  date: string
  count: number
  converted: number
}

export interface ReportsLeads {
  total: number
  byPeriod: LeadsByPeriod[]
  byStatus: Array<{ status: string; count: number; percentage: number }>
  byOrigin: Array<{ origin: string; count: number; percentage: number }>
}

export interface ConversionByAttendant {
  userId: string
  userName: string
  totalLeads: number
  convertedLeads: number
  conversionRate: number
}

export interface ReportsConversion {
  overallRate: number
  byAttendant: ConversionByAttendant[]
}

export interface AttendanceMetrics {
  userId: string
  userName: string
  totalAttendances: number
  averageTime: number
  averageResponseTime: number
  conversionRate: number
}

export interface ReportsAttendance {
  averageAttendanceTime: number
  averageResponseTime: number
  byAttendant: AttendanceMetrics[]
}

export interface CampaignMetrics {
  campaignId: string
  campaignName: string
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  dailyLeads: Array<{ date: string; count: number }>
}

export interface ReportsCampaigns {
  campaigns: CampaignMetrics[]
  comparison: Array<{ campaign: string; leads: number; converted: number; rate: number }>
}

export interface JourneyStep {
  step: string
  count: number
  percentage: number
}

export interface ReportsJourney {
  steps: JourneyStep[]
  flow: Array<{ from: string; to: string; count: number }>
}

export interface ReportsMessages {
  total: number
  manual: number
  automatic: number
  byPeriod: Array<{ date: string; manual: number; automatic: number }>
}

export interface ScheduledMetrics {
  total: number
  executed: number
  failed: number
  pending: number
  byPeriod: Array<{ date: string; executed: number; failed: number }>
}

export interface ReportsScheduled {
  scheduled: ScheduledMetrics
  errors: Array<{ date: string; count: number; messages: string[] }>
}

export const reportsAPI = {
  getOverview: async (filters: ReportsFilter): Promise<ReportsOverview> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsOverview>(`/reports/overview?${params.toString()}`)
  },

  getLeads: async (filters: ReportsFilter): Promise<ReportsLeads> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))
    if (filters.period) params.append('period', filters.period)

    return apiRequest<ReportsLeads>(`/reports/leads?${params.toString()}`)
  },

  getConversion: async (filters: ReportsFilter): Promise<ReportsConversion> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsConversion>(`/reports/conversion?${params.toString()}`)
  },

  getAttendance: async (filters: ReportsFilter): Promise<ReportsAttendance> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsAttendance>(`/reports/attendance?${params.toString()}`)
  },

  getCampaigns: async (filters: ReportsFilter): Promise<ReportsCampaigns> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsCampaigns>(`/reports/campaigns?${params.toString()}`)
  },

  getJourney: async (filters: ReportsFilter): Promise<ReportsJourney> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsJourney>(`/reports/journey?${params.toString()}`)
  },

  getMessages: async (filters: ReportsFilter): Promise<ReportsMessages> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsMessages>(`/reports/messages?${params.toString()}`)
  },

  getScheduled: async (filters: ReportsFilter): Promise<ReportsScheduled> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))

    return apiRequest<ReportsScheduled>(`/reports/scheduled?${params.toString()}`)
  },

  export: async (filters: ReportsFilter, format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('startDate', filters.startDate)
    if (filters.endDate) params.append('endDate', filters.endDate)
    if (filters.userId) params.append('userId', filters.userId)
    if (filters.campaignId) params.append('campaignId', filters.campaignId)
    if (filters.origin) params.append('origin', filters.origin)
    if (filters.status) filters.status.forEach(s => params.append('status', s))
    if (filters.converted !== undefined) params.append('converted', String(filters.converted))
    params.append('format', format)

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/reports/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) {
      throw new Error('Erro ao exportar relatório')
    }

    return response.blob()
  },
}

