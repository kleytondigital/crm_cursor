'use client'

import { useState, useEffect } from 'react'
import { X, Eye, CheckCircle, Wand2, RefreshCw, Loader2, Sparkles, Edit3, Save, LayoutGrid, ChevronRight, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api'
import { pipelineStagesAPI, type PipelineStage } from '@/lib/api/pipeline-stages'

interface PromptConfigModalProps {
  instance: {
    id: string
    name: string
    config?: Record<string, any>
    generatedPrompt?: string | null
    template: {
      id: string
      name: string
      variables?: Record<string, any>
    }
  }
  onClose: () => void
  onSuccess?: () => void
}

export default function PromptConfigModal({
  instance,
  onClose,
  onSuccess,
}: PromptConfigModalProps) {
  // Estados principais
  const [mainPrompt, setMainPrompt] = useState(instance.generatedPrompt || '')
  const [kanbanEnabled, setKanbanEnabled] = useState(false)
  const [kanbanPrompt, setKanbanPrompt] = useState<string | null>(null)
  const [kanbanStageIds, setKanbanStageIds] = useState<string[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingStages, setLoadingStages] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Estados para preview e confirmação
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState('')
  
  // Estados para criação/ajuste de prompt
  const [showCreatePrompt, setShowCreatePrompt] = useState(false)
  const [showAdjustPrompt, setShowAdjustPrompt] = useState(false)
  const [variables, setVariables] = useState<Array<{ name: string; value: any }>>([])
  const [promptAjuste, setPromptAjuste] = useState('')
  const [textAjuste, setTextAjuste] = useState('')

  // Carregar dados iniciais
  useEffect(() => {
    loadCurrentPrompt()
    loadStages()
  }, [instance.id])

  const loadCurrentPrompt = async () => {
    try {
      const data = await apiRequest<{
        prompt: string | null
        kanbanEnabled: boolean
        kanbanPrompt: string | null
        kanbanStageIds: string[] | null
        fullPrompt?: string
      }>(`/workflow-templates/instances/${instance.id}/prompt`)
      
      // Carregar prompt principal
      if (data.prompt) {
        setMainPrompt(data.prompt)
      } else if (instance.generatedPrompt) {
        setMainPrompt(instance.generatedPrompt)
      }

      // Carregar configuração Kanban
      if (data.kanbanEnabled !== undefined) {
        setKanbanEnabled(data.kanbanEnabled)
      }
      
      if (data.kanbanPrompt) {
        setKanbanPrompt(data.kanbanPrompt)
      }
      
      if (data.kanbanStageIds && data.kanbanStageIds.length > 0) {
        setKanbanStageIds(data.kanbanStageIds)
        setSelectedStages(new Set(data.kanbanStageIds))
      }
    } catch (error) {
      console.error('Erro ao carregar prompt:', error)
      if (instance.generatedPrompt) {
        setMainPrompt(instance.generatedPrompt)
      }
    }
  }

  const loadStages = async () => {
    setLoadingStages(true)
    try {
      const stagesData = await pipelineStagesAPI.getAll()
      setStages(stagesData.filter((s) => s.isActive))
    } catch (error) {
      console.error('Erro ao carregar estágios:', error)
    } finally {
      setLoadingStages(false)
    }
  }

  // Inicializar variáveis para criação de prompt
  useEffect(() => {
    if (showCreatePrompt && instance.config) {
      const vars = Object.entries(instance.config || {}).map(([key, value]) => ({
        name: key,
        value: value || '',
      }))
      setVariables(vars)
    }
  }, [showCreatePrompt, instance.config])

  const handleVariableChange = (index: number, value: any) => {
    const newVars = [...variables]
    newVars[index].value = value
    setVariables(newVars)
  }

  const handleCreateOrAdjustPrompt = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const payload: any = {
        type: showCreatePrompt ? 'system' : 'user',
      }

      if (showCreatePrompt) {
        // Criar prompt do zero com variáveis
        payload.variables = variables.map(v => ({ name: v.name, value: v.value }))
      } else {
        // Ajustar prompt existente
        payload.prompt_ajuste = promptAjuste || mainPrompt
        payload.text_ajuste = textAjuste
      }

      const data = await apiRequest<{ prompt: string }>(
        `/workflow-templates/instances/${instance.id}/prompt`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      setMainPrompt(data.prompt)
      setSuccessMessage('Prompt gerado com sucesso!')
      
      // Fechar modais de criação/ajuste
      setShowCreatePrompt(false)
      setShowAdjustPrompt(false)
      setTextAjuste('')
      
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Erro ao criar/ajustar prompt:', error)
      setError(error.response?.data?.message || error.message || 'Erro ao criar/ajustar prompt')
    } finally {
      setLoading(false)
    }
  }

  const handleKanbanToggle = (enabled: boolean) => {
    setKanbanEnabled(enabled)
    if (!enabled) {
      setSelectedStages(new Set())
      setKanbanPrompt(null)
    }
  }

  const handleStageToggle = (stageId: string) => {
    const newSelected = new Set(selectedStages)
    if (newSelected.has(stageId)) {
      newSelected.delete(stageId)
    } else {
      newSelected.add(stageId)
    }
    setSelectedStages(newSelected)
  }

  const generateKanbanInstructions = (): string => {
    if (!kanbanEnabled || selectedStages.size === 0) {
      return ''
    }

    // Filtrar estágios selecionados
    const selectedStagesData = stages.filter((s) => selectedStages.has(s.id))
    
    // Validar se há estágios selecionados
    if (selectedStagesData.length === 0) {
      return ''
    }

    // Construir instruções de forma mais robusta usando array e join
    const instructionsParts: string[] = []
    
    instructionsParts.push(`## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS (KANBAN/PIPELINE)`)
    instructionsParts.push('')
    instructionsParts.push(`Você tem acesso a uma ferramenta especial para gerenciar os estágios do lead no pipeline de vendas.`)
    instructionsParts.push('')
    instructionsParts.push(`### ESTÁGIOS DISPONÍVEIS:`)
    instructionsParts.push('')
    
    // Adicionar lista de estágios
    selectedStagesData.forEach((stage) => {
      instructionsParts.push(`- **${stage.name}** (Status: ${stage.status})`)
    })
    
    instructionsParts.push('')
    instructionsParts.push(`### Dados Importantes:`)
    instructionsParts.push('')
    instructionsParts.push(`- phone: {{ $json.phone }}`)
    instructionsParts.push(`- data de agora: {{ $now }}`)
    instructionsParts.push(`- baseurl: https://backcrm.aoseudispor.com.br`)
    instructionsParts.push('')
    instructionsParts.push(`### COMO USAR:`)
    instructionsParts.push('')
    instructionsParts.push(`Quando você identificar que o lead deve ser movido para um estágio específico, você deve:`)
    instructionsParts.push('')
    instructionsParts.push(`1. Identificar o estágio apropriado baseado na interação com o lead`)
    instructionsParts.push(`2. Chamar a tool de atualização de estágio com o telefone do lead e o status correspondente`)
    instructionsParts.push(`3. O url é: {baseurl}/webhooks/n8n/leads/{phone}/status com body: { "status": "STATUS_DO_ESTÁGIO" }`)
    instructionsParts.push('')
    instructionsParts.push(`### EXEMPLOS DE USO:`)
    instructionsParts.push('')
    
    // Adicionar exemplos de uso para cada estágio
    selectedStagesData.forEach((stage) => {
      const stageNameLower = stage.name.toLowerCase()
      let action = 'quando apropriado baseado na conversa'
      
      if (stageNameLower.includes('enviou') || stageNameLower.includes('catálogo') || stageNameLower.includes('catalogo')) {
        action = 'quando você enviar o catálogo ao cliente'
      } else if (stageNameLower.includes('qualificado') || stageNameLower.includes('interessado')) {
        action = 'quando o cliente demonstrar interesse claro'
      } else if (stageNameLower.includes('proposta') || stageNameLower.includes('orcamento') || stageNameLower.includes('orçamento')) {
        action = 'quando você enviar uma proposta ou orçamento'
      } else if (stageNameLower.includes('fechado') || stageNameLower.includes('concluido') || stageNameLower.includes('concluído')) {
        action = 'quando o atendimento for finalizado'
      }
      
      instructionsParts.push(`- **${stage.name}**: Use este estágio ${action}. Chame a tool com status "${stage.status}".`)
    })

    instructionsParts.push('')
    instructionsParts.push(`### REGRAS IMPORTANTES:`)
    instructionsParts.push('')
    instructionsParts.push(`- Sempre mova o lead para o estágio apropriado após ações relevantes (ex: enviar catálogo, enviar proposta)`)
    instructionsParts.push(`- Seja proativo: não espere o cliente pedir, mova automaticamente quando a ação ocorrer`)
    instructionsParts.push(`- Use apenas os estágios listados acima`)
    instructionsParts.push(`- O telefone do lead estará disponível nas variáveis do workflow`)
    instructionsParts.push('')

    // Juntar todas as partes com quebras de linha
    return instructionsParts.join('\n')
  }

  const handleApplyKanban = () => {
    if (!kanbanEnabled || selectedStages.size === 0) {
      setError('Selecione pelo menos um estágio para aplicar')
      return
    }

    const kanbanInstructions = generateKanbanInstructions()
    setKanbanPrompt(kanbanInstructions)
    setKanbanStageIds(Array.from(selectedStages))
    setSuccessMessage('Instruções de Kanban preparadas! Clique em "Salvar Prompt" para aplicar.')
    
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  // Função para gerar preview concatenado
  const generateFullPrompt = (): string => {
    let full = mainPrompt.trim()
    
    if (kanbanEnabled && kanbanPrompt) {
      // Remover instruções antigas de Kanban do prompt principal
      const kanbanPattern = /## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS[\s\S]*?(?=\n## |\n\n## |$)/g
      full = full.replace(kanbanPattern, '').trim()
      // Adicionar prompt kanban
      full = `${full}\n\n${kanbanPrompt}`.trim()
    } else if (!kanbanEnabled) {
      // Remover instruções de Kanban se desativado
      const kanbanPattern = /## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS[\s\S]*?(?=\n## |\n\n## |$)/g
      full = full.replace(kanbanPattern, '').trim()
    }
    
    return full
  }

  // Função para mostrar preview e confirmar salvamento
  const handleShowPreviewAndSave = () => {
    if (!mainPrompt.trim()) {
      setError('O prompt principal não pode estar vazio')
      return
    }

    const fullPrompt = generateFullPrompt()
    setPreviewPrompt(fullPrompt)
    setShowPreviewModal(true)
  }

  // Função para confirmar e salvar
  const handleConfirmAndSave = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      // Preparar payload com prompt base e configuração Kanban separados
      const payload: {
        prompt: string
        kanbanEnabled?: boolean
        kanbanPrompt?: string | null
        kanbanStageIds?: string[] | null
      } = {
        prompt: mainPrompt.trim(), // Prompt principal (sem kanban)
      }

      // Se houver prompt kanban, ativar e salvar
      if (kanbanPrompt && kanbanEnabled && selectedStages.size > 0) {
        payload.kanbanEnabled = true
        payload.kanbanPrompt = kanbanPrompt
        payload.kanbanStageIds = Array.from(selectedStages)
      } else {
        // Se não houver, desativar kanban
        payload.kanbanEnabled = false
        payload.kanbanPrompt = null
        payload.kanbanStageIds = null
      }

      await apiRequest(`/workflow-templates/instances/${instance.id}/prompt`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      // Atualizar estados locais
      if (payload.kanbanEnabled && payload.kanbanPrompt) {
        setKanbanPrompt(payload.kanbanPrompt)
      } else {
        setKanbanPrompt(null)
        setKanbanEnabled(false)
        setSelectedStages(new Set())
        setKanbanStageIds([])
      }

      setSuccessMessage('Prompt salvo com sucesso!')
      setShowPreviewModal(false)
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Erro ao salvar prompt:', error)
      setError(error.response?.data?.message || error.message || 'Erro ao salvar prompt')
      // Não fechar modal de preview em caso de erro
    } finally {
      setLoading(false)
      setTimeout(() => {
        setSuccessMessage('')
        setError('')
      }, 3000)
    }
  }

  return (
    <>
      {/* Modal Principal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-3xl border border-white/10 bg-background-subtle/95 backdrop-blur-xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-brand-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-primary/20 text-brand-secondary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Configurar Prompt do Agente</h2>
                <p className="text-sm text-text-muted mt-0.5">{instance.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content - Layout Fluido */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Mensagens */}
            {successMessage && (
              <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Seção de Ações Rápidas */}
            <div className="mb-6 flex gap-3 flex-wrap">
              {!mainPrompt && (
                <Button
                  onClick={() => {
                    setShowCreatePrompt(true)
                    setShowAdjustPrompt(false)
                  }}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={loading}
                >
                  <Wand2 className="h-4 w-4" />
                  Criar Prompt
                </Button>
              )}
              
              {mainPrompt && (
                <Button
                  onClick={() => {
                    setPromptAjuste(mainPrompt)
                    setShowAdjustPrompt(true)
                    setShowCreatePrompt(false)
                  }}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  Ajustar Prompt
                </Button>
              )}
            </div>

            {/* Modal de Criar Prompt */}
            {showCreatePrompt && (
              <div className="mb-6 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-brand-primary" />
                    Criar Prompt com IA
                  </h3>
                  <button
                    onClick={() => setShowCreatePrompt(false)}
                    className="text-text-muted hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-3 mb-4">
                  {variables.map((variable, index) => (
                    <div key={index} className="rounded-lg border border-white/10 bg-background-muted/40 p-3">
                      <label className="mb-2 block text-xs font-medium text-text-muted">
                        {variable.name}
                      </label>
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => handleVariableChange(index, e.target.value)}
                        placeholder={`Digite o valor para ${variable.name}`}
                        className="w-full rounded-lg border border-white/10 bg-background-subtle/60 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateOrAdjustPrompt}
                    disabled={loading || variables.length === 0 || !variables.every(v => v.value || v.value === 0)}
                    className="gap-2 bg-brand-primary text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Gerar Prompt
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowCreatePrompt(false)}
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Modal de Ajustar Prompt */}
            {showAdjustPrompt && (
              <div className="mb-6 rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-brand-primary" />
                    Ajustar Prompt com IA
                  </h3>
                  <button
                    onClick={() => setShowAdjustPrompt(false)}
                    className="text-text-muted hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Prompt Atual</label>
                    <textarea
                      value={promptAjuste || mainPrompt}
                      onChange={(e) => setPromptAjuste(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none resize-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white">Solicitação de Ajuste</label>
                    <textarea
                      value={textAjuste}
                      onChange={(e) => setTextAjuste(e.target.value)}
                      placeholder="Ex: 'Torne o prompt mais formal' ou 'Adicione instruções sobre como tratar clientes insatisfeitos'..."
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCreateOrAdjustPrompt}
                    disabled={loading || !textAjuste.trim()}
                    className="gap-2 bg-brand-primary text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ajustando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Ajustar Prompt
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowAdjustPrompt(false)}
                    variant="ghost"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Layout em 2 Colunas: Prompt Principal | Funções Kanban */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda: Prompt Principal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-brand-primary" />
                    Prompt Principal
                  </h3>
                  {mainPrompt && (
                    <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded">
                      {mainPrompt.length} caracteres
                    </span>
                  )}
                </div>
                
                <textarea
                  value={mainPrompt}
                  onChange={(e) => setMainPrompt(e.target.value)}
                  placeholder="Digite ou cole o prompt do agente aqui...&#10;&#10;Você pode usar 'Criar Prompt' para gerar automaticamente ou 'Ajustar Prompt' para refinar um prompt existente."
                  rows={25}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none font-mono leading-relaxed whitespace-pre-wrap break-words"
                />
              </div>

              {/* Coluna Direita: Funções Kanban */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-brand-primary" />
                    Funções Kanban
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kanbanEnabled}
                      onChange={(e) => handleKanbanToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>

                {kanbanEnabled ? (
                  <div className="rounded-xl border border-white/10 bg-background-muted/40 p-4 space-y-4">
                    {loadingStages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                        <span className="ml-2 text-sm text-text-muted">Carregando estágios...</span>
                      </div>
                    ) : stages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-background-subtle/40 p-6 text-center text-sm text-text-muted">
                        Nenhum estágio cadastrado
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-white mb-3">Selecione os estágios:</h4>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {stages.map((stage) => (
                              <label
                                key={stage.id}
                                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${
                                  selectedStages.has(stage.id)
                                    ? 'border-brand-primary bg-brand-primary/10'
                                    : 'border-white/10 bg-background-subtle/40 hover:border-white/20'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStages.has(stage.id)}
                                  onChange={() => handleStageToggle(stage.id)}
                                  className="w-4 h-4 text-brand-primary bg-background-subtle border-white/20 rounded focus:ring-brand-primary focus:ring-2"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: stage.color }}
                                    />
                                    <span className="text-sm font-medium text-white">{stage.name}</span>
                                  </div>
                                  <span className="text-xs text-text-muted">
                                    {stage.status}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        {selectedStages.size > 0 && (
                          <Button
                            onClick={handleApplyKanban}
                            size="sm"
                            className="w-full gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
                          >
                            <LayoutGrid className="h-4 w-4" />
                            Gerar Instruções Kanban
                          </Button>
                        )}

                        {kanbanPrompt && (
                          <div className="mt-4 rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-brand-primary" />
                                <span className="text-xs font-semibold text-brand-secondary">Instruções Kanban Geradas</span>
                              </div>
                              <button
                                onClick={() => {
                                  setKanbanPrompt(null)
                                  setSelectedStages(new Set())
                                }}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Limpar
                              </button>
                            </div>
                            <div className="text-xs text-text-muted max-h-48 overflow-y-auto font-mono whitespace-pre-wrap break-words p-2 bg-background-subtle/60 rounded">
                              {kanbanPrompt}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-background-muted/20 p-12 text-center">
                    <LayoutGrid className="h-12 w-12 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-text-muted">
                      Ative as funções Kanban para permitir que o agente mova leads automaticamente entre estágios do pipeline
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer com Botão Salvar */}
          <div className="flex items-center justify-between border-t border-white/10 bg-background-muted/40 px-6 py-4 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Eye className="h-4 w-4" />
              <span>O preview será mostrado antes de salvar</span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleShowPreviewAndSave}
                disabled={loading || !mainPrompt.trim()}
                className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Preview e Confirmação */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-brand-primary/30 bg-background-subtle shadow-2xl flex flex-col">
            {/* Header do Preview */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0 bg-gradient-to-r from-brand-primary/20 to-transparent">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-brand-primary" />
                <div>
                  <h3 className="text-xl font-bold text-white">Preview do Prompt Completo</h3>
                  <p className="text-xs text-text-muted mt-0.5">Revise o prompt antes de salvar</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-text-muted">
                  Prompt Principal: {mainPrompt.length} caracteres
                </div>
                {kanbanEnabled && kanbanPrompt && (
                  <div className="rounded-lg bg-brand-primary/20 px-3 py-1.5 text-xs text-brand-secondary">
                    Funções Kanban: Ativadas
                  </div>
                )}
                <div className="rounded-lg bg-green-500/20 px-3 py-1.5 text-xs text-green-400">
                  Total: {previewPrompt.length} caracteres
                </div>
              </div>

              {/* Preview com destaques */}
              <div className="space-y-4">
                {/* Prompt Principal */}
                <div className="rounded-xl border border-white/10 bg-background-muted/40 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-brand-primary" />
                    <span className="text-sm font-semibold text-white">Prompt Principal</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm text-white font-mono max-h-64 overflow-y-auto bg-background-subtle/60 p-3 rounded">
                    {mainPrompt || <span className="text-text-muted italic">Vazio</span>}
                  </pre>
                </div>

                {/* Prompt Kanban (se existir) */}
                {kanbanEnabled && kanbanPrompt && (
                  <div className="rounded-xl border border-brand-primary/30 bg-brand-primary/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-brand-primary" />
                      <span className="text-sm font-semibold text-brand-secondary">Funções Kanban</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-sm text-white font-mono max-h-64 overflow-y-auto bg-brand-primary/10 p-3 rounded">
                      {kanbanPrompt}
                    </pre>
                  </div>
                )}

                {/* Preview Completo Concatenado */}
                <div className="rounded-xl border-2 border-brand-primary/50 bg-background-subtle/80 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-primary" />
                    <span className="text-sm font-semibold text-white">Prompt Completo (será enviado ao agente)</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm text-white font-mono max-h-96 overflow-y-auto bg-background-muted/60 p-4 rounded">
                    {previewPrompt || <span className="text-text-muted italic">Vazio</span>}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer do Preview */}
            <div className="flex items-center justify-between border-t border-white/10 bg-background-muted/40 px-6 py-4 flex-shrink-0">
              <div className="text-sm text-text-muted">
                Este é o prompt que será enviado ao agente de IA
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmAndSave}
                  disabled={loading}
                  className="gap-2 bg-green-500 text-white hover:bg-green-500/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirmar e Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
