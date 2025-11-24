'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, XCircle, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReportsFilter } from '@/lib/api/reports'

interface ReportsFiltersProps {
  filters: ReportsFilter
  onChange: (filters: ReportsFilter) => void
  onReset: () => void
  users?: Array<{ id: string; name: string }>
  campaigns?: Array<{ id: string; name: string }>
}

export default function ReportsFilters({
  filters,
  onChange,
  onReset,
  users = [],
  campaigns = [],
}: ReportsFiltersProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isDateCollapsed, setIsDateCollapsed] = useState(true)
  const [isUserCollapsed, setIsUserCollapsed] = useState(true)
  const [isStatusCollapsed, setIsStatusCollapsed] = useState(true)
  const [isOriginCollapsed, setIsOriginCollapsed] = useState(true)

  const hasActiveFilters = Boolean(
    filters.startDate ||
    filters.endDate ||
    filters.userId ||
    filters.campaignId ||
    filters.origin ||
    (filters.status && filters.status.length > 0) ||
    filters.converted !== undefined
  )

  const origins = ['Facebook', 'Google', 'TikTok', 'Orgânico', 'Outros']
  const statuses = ['NOVO', 'EM_ATENDIMENTO', 'AGUARDANDO', 'CONCLUIDO']

  return (
    <div className="flex flex-col gap-2 md:gap-3 rounded-3xl border border-white/5 bg-background-subtle/70 p-3 md:p-4 shadow-inner-glow">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs md:text-sm font-semibold text-white">Filtros</h3>
          {hasActiveFilters && (
            <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-[10px] font-semibold text-brand-secondary">
              Ativo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onReset()
              }}
              className="h-7 w-7 md:h-8 md:w-8 rounded-full border border-white/10 bg-background-soft/80 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary flex-shrink-0 transition-all flex items-center justify-center"
              title="Limpar filtros"
            >
              <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </button>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          ) : (
            <ChevronUp className="h-4 w-4 text-text-muted group-hover:text-brand-secondary transition-colors" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <div className="flex flex-col gap-2 md:gap-3 transition-all duration-200 ease-in-out">
          {/* Datas */}
          <div className="border-b border-white/5 pb-2 md:pb-3">
            <button
              onClick={() => setIsDateCollapsed(!isDateCollapsed)}
              className="flex w-full items-center justify-between group mb-2"
            >
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Período</span>
              {isDateCollapsed ? (
                <ChevronDown className="h-3 w-3 text-text-muted" />
              ) : (
                <ChevronUp className="h-3 w-3 text-text-muted" />
              )}
            </button>
            {!isDateCollapsed && (
              <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] md:text-xs text-text-muted">Data Inicial</label>
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => onChange({ ...filters, startDate: e.target.value || undefined })}
                    className="rounded-xl border border-white/10 bg-background-muted/80 text-xs md:text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] md:text-xs text-text-muted">Data Final</label>
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => onChange({ ...filters, endDate: e.target.value || undefined })}
                    className="rounded-xl border border-white/10 bg-background-muted/80 text-xs md:text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Usuário */}
          <div className="border-b border-white/5 pb-2 md:pb-3">
            <button
              onClick={() => setIsUserCollapsed(!isUserCollapsed)}
              className="flex w-full items-center justify-between group mb-2"
            >
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Usuário / Campanha</span>
              {isUserCollapsed ? (
                <ChevronDown className="h-3 w-3 text-text-muted" />
              ) : (
                <ChevronUp className="h-3 w-3 text-text-muted" />
              )}
            </button>
            {!isUserCollapsed && (
              <div className="grid gap-2 md:gap-3 grid-cols-1 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] md:text-xs text-text-muted">Atendente</label>
                  <select
                    value={filters.userId || ''}
                    onChange={(e) => onChange({ ...filters, userId: e.target.value || undefined })}
                    className="rounded-xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none"
                  >
                    <option value="">Todos</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] md:text-xs text-text-muted">Campanha</label>
                  <select
                    value={filters.campaignId || ''}
                    onChange={(e) => onChange({ ...filters, campaignId: e.target.value || undefined })}
                    className="rounded-xl border border-white/10 bg-background-muted/80 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-text-primary focus:border-brand-secondary focus:outline-none"
                  >
                    <option value="">Todas</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="border-b border-white/5 pb-2 md:pb-3">
            <button
              onClick={() => setIsStatusCollapsed(!isStatusCollapsed)}
              className="flex w-full items-center justify-between group mb-2"
            >
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Status</span>
              {isStatusCollapsed ? (
                <ChevronDown className="h-3 w-3 text-text-muted" />
              ) : (
                <ChevronUp className="h-3 w-3 text-text-muted" />
              )}
            </button>
            {!isStatusCollapsed && (
              <div className="flex flex-wrap gap-2">
                {statuses.map((status) => {
                  const isSelected = filters.status?.includes(status)
                  return (
                    <button
                      key={status}
                      onClick={() => {
                        const newStatus = filters.status || []
                        if (isSelected) {
                          onChange({ ...filters, status: newStatus.filter(s => s !== status) })
                        } else {
                          onChange({ ...filters, status: [...newStatus, status] })
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        isSelected
                          ? 'bg-brand-primary/20 text-brand-secondary border border-brand-secondary/40'
                          : 'bg-background-muted/80 text-text-muted border border-white/10'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Origem */}
          <div>
            <button
              onClick={() => setIsOriginCollapsed(!isOriginCollapsed)}
              className="flex w-full items-center justify-between group mb-2"
            >
              <span className="text-[10px] md:text-xs uppercase tracking-wide text-text-muted">Origem</span>
              {isOriginCollapsed ? (
                <ChevronDown className="h-3 w-3 text-text-muted" />
              ) : (
                <ChevronUp className="h-3 w-3 text-text-muted" />
              )}
            </button>
            {!isOriginCollapsed && (
              <div className="flex flex-wrap gap-2">
                {origins.map((origin) => {
                  const isSelected = filters.origin === origin
                  return (
                    <button
                      key={origin}
                      onClick={() => onChange({ ...filters, origin: isSelected ? undefined : origin })}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                        isSelected
                          ? 'bg-brand-primary/20 text-brand-secondary border border-brand-secondary/40'
                          : 'bg-background-muted/80 text-text-muted border border-white/10'
                      }`}
                    >
                      {origin}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

