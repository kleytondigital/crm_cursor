'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface DetailedTableProps<T> {
  title: string
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  columns: Array<{
    key: string
    label: string
    render?: (value: any, row: T) => React.ReactNode
  }>
  onPageChange: (page: number) => void
  onRowClick?: (row: T) => void
  loading?: boolean
}

export default function DetailedTable<T extends Record<string, any>>({
  title,
  data,
  total,
  page,
  pageSize,
  totalPages,
  columns,
  onPageChange,
  onRowClick,
  loading = false,
}: DetailedTableProps<T>) {
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  if (loading) {
    return (
      <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-secondary"></div>
        </div>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="flex items-center justify-center py-12 text-text-muted">
          <p>Nenhum dado disponível</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-3xl border border-white/5 bg-background-subtle/60 p-4 md:p-6 shadow-inner-glow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-xs text-text-muted">
          {startItem}-{endItem} de {total}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={row.id || index}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-white/5 hover:bg-background-muted/40 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((column) => (
                  <td key={column.key} className="py-3 px-4 text-sm text-white">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              className="h-8 w-8 p-0 border-white/10 bg-background-muted/80"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="h-8 w-8 p-0 border-white/10 bg-background-muted/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-xs text-text-muted">
            Página {page} de {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="h-8 w-8 p-0 border-white/10 bg-background-muted/80"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              className="h-8 w-8 p-0 border-white/10 bg-background-muted/80"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

