'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ReportsFilter } from '@/lib/api/reports'

interface SavedFilter {
  id: string
  name: string
  filters: ReportsFilter
  createdAt: string
}

interface SavedFiltersProps {
  filters: ReportsFilter
  onLoadFilter: (filters: ReportsFilter) => void
}

const STORAGE_KEY = 'reports_saved_filters'

export default function SavedFilters({ filters, onLoadFilter }: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [showList, setShowList] = useState(false)

  useEffect(() => {
    loadSavedFilters()
  }, [])

  const loadSavedFilters = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSavedFilters(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Erro ao carregar filtros salvos:', error)
    }
  }

  const saveFilters = () => {
    if (!filterName.trim()) {
      alert('Digite um nome para o filtro')
      return
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    }

    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setFilterName('')
    setShowSaveModal(false)
  }

  const deleteFilter = (id: string) => {
    const updated = savedFilters.filter((f) => f.id !== id)
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const loadFilter = (savedFilter: SavedFilter) => {
    onLoadFilter(savedFilter.filters)
    setShowList(false)
  }

  const hasActiveFilters = Boolean(
    filters.startDate ||
    filters.endDate ||
    filters.userId ||
    filters.campaignId ||
    filters.origin ||
    (filters.status && filters.status.length > 0) ||
    filters.converted !== undefined
  )

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowList(!showList)}
          className="border-white/10 bg-background-muted/80 gap-2"
        >
          <BookmarkCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Filtros Salvos ({savedFilters.length})</span>
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveModal(true)}
            className="border-white/10 bg-background-muted/80 gap-2"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Salvar Filtros</span>
          </Button>
        )}
      </div>

      {/* Lista de Filtros Salvos */}
      {showList && savedFilters.length > 0 && (
        <Card className="absolute top-full left-0 mt-2 z-50 w-80 rounded-2xl border border-white/5 bg-background-subtle/90 p-4 shadow-inner-glow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Filtros Salvos</h3>
            <button
              onClick={() => setShowList(false)}
              className="h-6 w-6 rounded-full border border-white/10 bg-background-muted/80 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary flex items-center justify-center transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {savedFilters.map((savedFilter) => (
              <div
                key={savedFilter.id}
                className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-background-muted/40 hover:border-brand-secondary/40 transition-colors"
              >
                <button
                  onClick={() => loadFilter(savedFilter)}
                  className="flex-1 text-left text-sm text-white hover:text-brand-secondary transition-colors"
                >
                  {savedFilter.name}
                </button>
                <button
                  onClick={() => deleteFilter(savedFilter.id)}
                  className="h-6 w-6 rounded-full border border-white/10 bg-background-muted/80 text-text-muted hover:border-red-400/40 hover:text-red-400 flex items-center justify-center transition-all ml-2"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal para Salvar Filtro */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-3xl border border-white/5 bg-background-subtle/90 p-6 shadow-inner-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Salvar Filtros</h3>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setFilterName('')
                }}
                className="h-8 w-8 rounded-full border border-white/10 bg-background-muted/80 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary flex items-center justify-center transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Nome do Filtro
                </label>
                <Input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Ex: Leads de Janeiro 2025"
                  className="bg-background-muted/80 border-white/10 text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      saveFilters()
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveModal(false)
                    setFilterName('')
                  }}
                  className="border-white/10 bg-background-muted/80"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveFilters}
                  disabled={!filterName.trim()}
                  className="bg-brand-primary text-white"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

