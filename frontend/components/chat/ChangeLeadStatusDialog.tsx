'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { leadsAPI } from '@/lib/api'
import { pipelineStagesAPI, PipelineStage } from '@/lib/api/pipeline-stages'
import { Loader2 } from 'lucide-react'
import { Lead } from '@/types'

interface ChangeLeadStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string | null
  currentLead: Lead | null // Receber o lead completo para pegar o statusId atual
  onSuccess: () => void
}

export default function ChangeLeadStatusDialog({
  open,
  onOpenChange,
  leadId,
  currentLead,
  onSuccess,
}: ChangeLeadStatusDialogProps) {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loadingStages, setLoadingStages] = useState(true)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carregar estágios quando o modal abrir
  useEffect(() => {
    if (open) {
      loadStages()
      // Definir estágio atual baseado no statusId do lead
      if (currentLead?.statusId) {
        setSelectedStageId(currentLead.statusId)
      }
    }
  }, [open, currentLead])

  const loadStages = async () => {
    try {
      setLoadingStages(true)
      const data = await pipelineStagesAPI.getAll()
      // Filtrar apenas estágios ativos e ordenar por ordem
      const activeStages = data
        .filter((stage) => stage.isActive)
        .sort((a, b) => a.order - b.order)
      setStages(activeStages)
    } catch (err: any) {
      console.error('Erro ao carregar estágios:', err)
      setError('Erro ao carregar estágios do pipeline')
    } finally {
      setLoadingStages(false)
    }
  }

  const handleUpdate = async () => {
    if (!leadId || !selectedStageId) {
      onOpenChange(false)
      return
    }

    // Verificar se realmente mudou
    const selectedStage = stages.find((s) => s.statusId === selectedStageId)
    if (!selectedStage || currentLead?.statusId === selectedStage.statusId) {
      onOpenChange(false)
      return
    }

    try {
      setUpdating(true)
      setError(null)

      // Atualizar usando o statusId do estágio selecionado
      await leadsAPI.updateStatusId(leadId, selectedStage.statusId)

      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar etapa do lead')
    } finally {
      setUpdating(false)
    }
  }

  const handleClose = () => {
    if (!updating) {
      if (currentLead?.statusId) {
        setSelectedStageId(currentLead.statusId)
      }
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Etapa do Lead</DialogTitle>
          <DialogDescription>
            Selecione a nova etapa para este lead no Kanban.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {error && (
            <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {loadingStages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-secondary" />
            </div>
          ) : stages.length === 0 ? (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Nenhum estágio configurado. Configure estágios no painel Gestor primeiro.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {stages.map((stage) => {
                const isSelected = selectedStageId === stage.statusId
                const isCurrent = currentLead?.statusId === stage.statusId

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStageId(stage.statusId)}
                    disabled={updating}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-brand-secondary bg-brand-secondary/20 text-brand-secondary'
                        : 'border-white/10 bg-background-muted/50 text-text-muted hover:border-brand-secondary/40 hover:text-brand-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium truncate">{stage.name}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-sm text-brand-secondary flex-shrink-0">Atual</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={updating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updating || !selectedStageId || currentLead?.statusId === selectedStageId}
            className="gap-2"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}




