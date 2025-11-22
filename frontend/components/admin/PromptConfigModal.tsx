'use client'

import { useState, useEffect } from 'react'
import { X, Eye, CheckCircle, Wand2, RefreshCw, Loader2, Sparkles, Edit3, Save, LayoutGrid, ChevronRight } from 'lucide-react'
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

type PromptMode = 'edit' | 'create' | 'adjust' | 'kanban'

export default function PromptConfigModal({
  instance,
  onClose,
  onSuccess,
}: PromptConfigModalProps) {
  const [promptMode, setPromptMode] = useState<PromptMode>('edit')
  const [directEditPrompt, setDirectEditPrompt] = useState(instance.generatedPrompt || '')
  const [variables, setVariables] = useState<Array<{ name: string; value: any }>>([])
  const [promptAjuste, setPromptAjuste] = useState(instance.generatedPrompt || '')
  const [textAjuste, setTextAjuste] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(instance.generatedPrompt || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [kanbanEnabled, setKanbanEnabled] = useState(false)
  const [kanbanPrompt, setKanbanPrompt] = useState<string | null>(null)
  const [kanbanStageIds, setKanbanStageIds] = useState<string[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set())
  const [loadingStages, setLoadingStages] = useState(false)

  // Carregar prompt atual ao montar
  useEffect(() => {
    loadCurrentPrompt()
  }, [instance.id])

  // Carregar prompt quando mudar para abas que precisam dele
  useEffect(() => {
    if ((promptMode === 'edit' || promptMode === 'adjust') && !generatedPrompt && !directEditPrompt) {
      loadCurrentPrompt()
    } else if (promptMode === 'edit' && generatedPrompt) {
      setDirectEditPrompt(generatedPrompt)
    } else if (promptMode === 'adjust' && generatedPrompt) {
      setPromptAjuste(generatedPrompt)
    }
  }, [promptMode])

  // Carregar estágios do pipeline quando Kanban for ativado
  useEffect(() => {
    if (promptMode === 'kanban' && !stages.length) {
      loadStages()
    }
  }, [promptMode])

  const loadCurrentPrompt = async () => {
    try {
      // Buscar do servidor para obter também a configuração Kanban
      const data = await apiRequest<{
        prompt: string | null
        kanbanEnabled: boolean
        kanbanPrompt: string | null
        kanbanStageIds: string[] | null
        fullPrompt?: string
      }>(`/workflow-templates/instances/${instance.id}/prompt`)
      
      // Carregar prompt base
      if (data.prompt) {
        setGeneratedPrompt(data.prompt)
        setDirectEditPrompt(data.prompt)
        setPromptAjuste(data.prompt)
      } else {
        // Se não houver prompt salvo, tentar usar o da instance
        if (instance.generatedPrompt) {
          setGeneratedPrompt(instance.generatedPrompt)
          setDirectEditPrompt(instance.generatedPrompt)
          setPromptAjuste(instance.generatedPrompt)
        } else {
          setGeneratedPrompt(null)
          setDirectEditPrompt('')
          setPromptAjuste('')
        }
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

      // Se houver estágios selecionados, carregar estágios para exibição
      if (data.kanbanEnabled && data.kanbanStageIds && data.kanbanStageIds.length > 0) {
        await loadStages()
      }
    } catch (error) {
      console.error('Erro ao carregar prompt:', error)
      // Em caso de erro, tentar usar o prompt da instance
      if (instance.generatedPrompt) {
        setGeneratedPrompt(instance.generatedPrompt)
        setDirectEditPrompt(instance.generatedPrompt)
        setPromptAjuste(instance.generatedPrompt)
      }
    }
  }

  const loadStages = async () => {
    setLoadingStages(true)
    try {
      const stagesData = await pipelineStagesAPI.getAll()
      setStages(stagesData.filter((s) => s.isActive))
      
      // Se já existe prompt, verificar se Kanban já está habilitado
      if (generatedPrompt && generatedPrompt.includes('Gerenciamento de Estágios')) {
        setKanbanEnabled(true)
      }
    } catch (error) {
      console.error('Erro ao carregar estágios:', error)
      setError('Erro ao carregar estágios do pipeline')
    } finally {
      setLoadingStages(false)
    }
  }

  // Inicializar variáveis a partir do config da instância
  useEffect(() => {
    if (promptMode === 'create' && instance.config) {
      const vars = Object.entries(instance.config || {}).map(([key, value]) => ({
        name: key,
        value: value || '',
      }))
      setVariables(vars)
    }
  }, [promptMode, instance.config])

  const handleVariableChange = (index: number, value: any) => {
    const newVars = [...variables]
    newVars[index].value = value
    setVariables(newVars)
  }

  const handleDirectSave = async () => {
    if (!directEditPrompt.trim()) {
      setError('Prompt não pode estar vazio')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      // Separar prompt base das instruções Kanban
      const kanbanPattern = /## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS.*?(?=\n## |\n\n## |$)/gs
      const kanbanMatch = directEditPrompt.match(kanbanPattern)
      let promptBase = directEditPrompt.replace(kanbanPattern, '').trim()
      const kanbanPromptText = kanbanMatch ? kanbanMatch[0].trim() : null

      // Preparar payload com prompt base e configuração Kanban
      const payload: {
        prompt: string
        kanbanEnabled?: boolean
        kanbanPrompt?: string | null
        kanbanStageIds?: string[] | null
      } = {
        prompt: promptBase,
      }

      // Se houver prompt kanban, ativar e salvar
      if (kanbanPromptText && kanbanEnabled && selectedStages.size > 0) {
        payload.kanbanEnabled = true
        payload.kanbanPrompt = kanbanPromptText
        payload.kanbanStageIds = Array.from(selectedStages)
      } else {
        // Se não houver, desativar
        payload.kanbanEnabled = false
        payload.kanbanPrompt = null
        payload.kanbanStageIds = null
      }

      const data = await apiRequest<{ prompt: string; instance: any }>(
        `/workflow-templates/instances/${instance.id}/prompt`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      )

      setGeneratedPrompt(data.prompt)
      setSuccessMessage('Prompt salvo com sucesso!')
      
      if (onSuccess) {
        onSuccess()
      }

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Erro ao salvar prompt:', error)
      setError(
        error.response?.data?.message ||
        error.message ||
        'Erro ao salvar prompt. Verifique as configurações e tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrAdjustPrompt = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const payload: any = {
        type: promptMode === 'create' ? 'system' : 'user',
      }

      if (promptMode === 'create') {
        // Criar prompt do zero
        if (variables.length === 0) {
          setError('Adicione pelo menos uma variável')
          setLoading(false)
          return
        }
        payload.variables = variables
      } else if (promptMode === 'adjust') {
        // Ajustar prompt existente
        if (!promptAjuste || !promptAjuste.trim()) {
          setError('Prompt para ajustar não pode estar vazio')
          setLoading(false)
          return
        }
        if (!textAjuste || !textAjuste.trim()) {
          setError('Solicitação de ajuste é obrigatória')
          setLoading(false)
          return
        }
        payload.prompt_ajuste = promptAjuste.trim()
        payload.text_ajuste = textAjuste.trim()
      }

      const data = await apiRequest<{ prompt: string; instance: any }>(
        `/workflow-templates/instances/${instance.id}/prompt`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      )

      setGeneratedPrompt(data.prompt)
      setDirectEditPrompt(data.prompt)
      setPromptAjuste(data.prompt)
      
      // Se era type=user, limpar o text_ajuste após sucesso
      if (promptMode === 'adjust') {
        setTextAjuste('')
      }

      setSuccessMessage('Prompt gerado/ajustado com sucesso!')

      // Callback de sucesso
      if (onSuccess) {
        onSuccess()
      }

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => setSuccessMessage(''), 3000)

      // Mostrar preview automaticamente
      setShowPreview(true)
    } catch (error: any) {
      console.error('Erro ao criar/ajustar prompt:', error)
      setError(
        error.response?.data?.message ||
        error.message ||
        'Erro ao criar/ajustar prompt. Verifique as configurações e tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleKanbanToggle = (enabled: boolean) => {
    setKanbanEnabled(enabled)
    if (!enabled) {
      setSelectedStages(new Set())
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

    const selectedStagesData = stages.filter((s) => selectedStages.has(s.id))
    
    let instructions = `\n\n## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS (KANBAN/PIPELINE)\n\n`
    instructions += `Você tem acesso a uma ferramenta especial para gerenciar os estágios do lead no pipeline de vendas.\n\n`
    instructions += `### ESTÁGIOS DISPONÍVEIS:\n\n`
    
    selectedStagesData.forEach((stage) => {
      instructions += `- **${stage.name}** (Status: ${stage.status})\n`
    })
    instructions += `\n### Dados Importantes:\n\n`
    instructions += `phone: {{ $json.phone }}\n`
    instructions += `data de agora: {{ $now }}\n`
    instructions += `url: https://backcrm.aoseudispor.com.br\n`
    instructions += `\n### COMO USAR:\n\n`
    instructions += `Quando você identificar que o lead deve ser movido para um estágio específico, você deve:\n\n`
    instructions += `1. Identificar o estágio apropriado baseado na interação com o lead\n`
    instructions += `2. Chamar a tool de atualização de estágio com o telefone do lead e o status correspondente\n`
    instructions += `3. O formato é: PATCH {url}/webhooks/n8n/leads/{phone}/status com body: { "status": "STATUS_DO_ESTÁGIO" }\n\n`
    instructions += `### EXEMPLOS DE USO:\n\n`
    
    selectedStagesData.forEach((stage) => {
      const action = stage.name.toLowerCase().includes('enviou') || stage.name.toLowerCase().includes('catálogo') 
        ? 'quando você enviar o catálogo ao cliente'
        : stage.name.toLowerCase().includes('qualificado') || stage.name.toLowerCase().includes('interessado')
        ? 'quando o cliente demonstrar interesse claro'
        : stage.name.toLowerCase().includes('proposta') || stage.name.toLowerCase().includes('orcamento')
        ? 'quando você enviar uma proposta ou orçamento'
        : stage.name.toLowerCase().includes('fechado') || stage.name.toLowerCase().includes('concluído')
        ? 'quando o atendimento for finalizado'
        : 'quando apropriado baseado na conversa'
      
      instructions += `- **${stage.name}**: Use este estágio ${action}. Chame a tool com status "${stage.status}".\n`
    })

    instructions += `\n### REGRAS IMPORTANTES:\n\n`
    instructions += `- Sempre mova o lead para o estágio apropriado após ações relevantes (ex: enviar catálogo, enviar proposta)\n`
    instructions += `- Seja proativo: não espere o cliente pedir, mova automaticamente quando a ação ocorrer\n`
    instructions += `- Use apenas os estágios listados acima\n`
    instructions += `- O telefone do lead estará disponível nas variáveis do workflow\n\n`

    return instructions
  }

  const handleApplyKanbanToPrompt = async () => {
    if (!kanbanEnabled || selectedStages.size === 0) {
      setError('Selecione pelo menos um estágio para aplicar ao prompt')
      return
    }

    const kanbanInstructions = generateKanbanInstructions()
    
    // Adicionar instruções ao prompt atual (ou criar um novo)
    let newPrompt = directEditPrompt || generatedPrompt || ''
    
    // Remover instruções antigas de Kanban se existirem (pattern melhorado)
    const kanbanPattern = /## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS.*?(?=\n## |\n\n## |$)/gs
    newPrompt = newPrompt.replace(kanbanPattern, '').trim()
    
    // Adicionar novas instruções apenas se não existirem
    if (!newPrompt.includes('## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS')) {
      newPrompt += kanbanInstructions
    }
    
    setDirectEditPrompt(newPrompt.trim())
    setGeneratedPrompt(newPrompt.trim())

    // Salvar automaticamente a configuração Kanban
    setLoading(true)
    try {
      const promptBase = newPrompt.replace(kanbanPattern, '').trim()
      
      const payload = {
        prompt: promptBase,
        kanbanEnabled: true,
        kanbanPrompt: kanbanInstructions,
        kanbanStageIds: Array.from(selectedStages),
      }

      await apiRequest(`/workflow-templates/instances/${instance.id}/prompt`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      setSuccessMessage('Instruções de Kanban aplicadas e salvas com sucesso!')
    } catch (error: any) {
      console.error('Erro ao salvar configuração Kanban:', error)
      setError(error.response?.data?.message || error.message || 'Erro ao salvar configuração Kanban')
      // Ainda mostrar no prompt mesmo se der erro ao salvar
      setSuccessMessage('Instruções de Kanban adicionadas localmente. Erro ao salvar no servidor.')
    } finally {
      setLoading(false)
    }
    
    setTimeout(() => {
      setSuccessMessage('')
      setError('')
    }, 3000)
  }

  const handleClearPrompt = async () => {
    if (!confirm('Tem certeza que deseja limpar o prompt gerado?')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      await apiRequest(`/workflow-templates/instances/${instance.id}/prompt`, {
        method: 'DELETE',
      })

      setGeneratedPrompt(null)
      setDirectEditPrompt('')
      setPromptAjuste('')
      setTextAjuste('')

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Erro ao limpar prompt:', error)
      setError(error.response?.data?.message || error.message || 'Erro ao limpar prompt')
    } finally {
      setLoading(false)
    }
  }

  const canCreateSystem = variables.length > 0 && variables.every(v => v.value || v.value === 0)
  const canAdjust = promptAjuste && promptAjuste.trim() && textAjuste && textAjuste.trim()
  const hasPrompt = generatedPrompt || directEditPrompt

  // Função para obter prompt completo (base + kanban) para preview
  const getFullPromptForPreview = (): string => {
    const basePrompt = directEditPrompt || generatedPrompt || ''
    if (kanbanEnabled && kanbanPrompt) {
      // Remover instruções antigas de Kanban do prompt base
      const kanbanPattern = /## FUNCIONALIDADE: GERENCIAMENTO DE ESTÁGIOS.*?(?=\n## |\n\n## |$)/gs
      const cleanedBase = basePrompt.replace(kanbanPattern, '').trim()
      return `${cleanedBase}\n\n${kanbanPrompt}`.trim()
    }
    return basePrompt
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-3xl border border-white/10 bg-background-subtle/95 backdrop-blur-xl shadow-2xl flex flex-col">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 rounded-2xl border border-white/5 bg-background-muted/60 p-1.5">
            <button
              onClick={async () => {
                setPromptMode('edit')
                setError('')
                setSuccessMessage('')
                setShowPreview(false)
                // Carregar prompt quando entrar na aba de edição
                if (!generatedPrompt && !directEditPrompt) {
                  await loadCurrentPrompt()
                } else if (generatedPrompt && directEditPrompt !== generatedPrompt) {
                  setDirectEditPrompt(generatedPrompt)
                }
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                promptMode === 'edit'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              Editar Direto
            </button>
            <button
              onClick={() => {
                setPromptMode('create')
                setError('')
                setSuccessMessage('')
                setShowPreview(false)
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                promptMode === 'create'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Wand2 className="h-4 w-4" />
              Criar Prompt
            </button>
            <button
              onClick={async () => {
                setPromptMode('adjust')
                setError('')
                setSuccessMessage('')
                setShowPreview(false)
                // Carregar prompt quando entrar na aba de ajuste
                if (!generatedPrompt && !promptAjuste) {
                  await loadCurrentPrompt()
                } else if (generatedPrompt && promptAjuste !== generatedPrompt) {
                  setPromptAjuste(generatedPrompt)
                }
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                promptMode === 'adjust'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              Ajustar Prompt
            </button>
            <button
              onClick={() => {
                setPromptMode('kanban')
                setError('')
                setSuccessMessage('')
                setShowPreview(false)
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                promptMode === 'kanban'
                  ? 'bg-brand-primary/20 text-white shadow-glow'
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Funções Kanban
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Edit Mode */}
          {promptMode === 'edit' && (
            <div className="space-y-4">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Edição Direta do Prompt</h3>
                  <Button
                    onClick={handleDirectSave}
                    disabled={loading || !directEditPrompt.trim()}
                    size="sm"
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
                <textarea
                  value={directEditPrompt}
                  onChange={(e) => setDirectEditPrompt(e.target.value)}
                  placeholder="Digite ou cole o prompt do agente aqui..."
                  rows={20}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none font-mono leading-relaxed whitespace-pre-wrap break-words"
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    lineHeight: '1.6',
                  }}
                />
                <p className="mt-2 text-xs text-text-muted">
                  Você pode editar o prompt diretamente aqui. Clique em "Salvar Prompt" para aplicar as alterações.
                </p>
              </div>
            </div>
          )}

          {/* Create Mode */}
          {promptMode === 'create' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Variáveis para Gerar o Prompt</h3>
                <div className="space-y-3">
                  {variables.map((variable, index) => (
                    <div key={index} className="rounded-xl border border-white/10 bg-background-muted/40 p-4">
                      <label className="mb-2 block text-xs font-medium text-text-muted">
                        {variable.name}
                      </label>
                      <input
                        type="text"
                        value={variable.value}
                        onChange={(e) => handleVariableChange(index, e.target.value)}
                        placeholder={`Digite o valor para ${variable.name}`}
                        className="w-full rounded-lg border border-white/10 bg-background-subtle/60 px-3 py-2 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
                      />
                    </div>
                  ))}
                  {variables.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 bg-background-muted/40 p-8 text-center text-sm text-text-muted">
                      Nenhuma variável configurada. As variáveis serão obtidas das configurações da automação.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Adjust Mode */}
          {promptMode === 'adjust' && (
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Prompt Atual para Ajustar</h3>
                <textarea
                  value={promptAjuste}
                  onChange={(e) => setPromptAjuste(e.target.value)}
                  placeholder="Cole ou digite o prompt que deseja ajustar..."
                  rows={8}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold text-white">Solicitação de Ajuste</h3>
                <textarea
                  value={textAjuste}
                  onChange={(e) => setTextAjuste(e.target.value)}
                  placeholder="Ex: 'Torne o prompt mais formal' ou 'Adicione instruções sobre como tratar clientes insatisfeitos'..."
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-background-muted/40 px-4 py-3 text-sm text-white placeholder:text-text-muted focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 resize-none"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Descreva como você deseja ajustar o prompt. Seja específico para melhores resultados.
                </p>
              </div>
            </div>
          )}

          {/* Kanban Mode */}
          {promptMode === 'kanban' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-background-muted/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Ativar Gerenciamento de Estágios (Kanban)</h3>
                    <p className="text-xs text-text-muted">
                      Permita que o agente mova leads automaticamente entre estágios do pipeline
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={kanbanEnabled}
                      onChange={(e) => handleKanbanToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-background-subtle peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                  </label>
                </div>

                {kanbanEnabled && (
                  <div className="mt-6 space-y-4">
                    {loadingStages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
                        <span className="ml-2 text-sm text-text-muted">Carregando estágios...</span>
                      </div>
                    ) : stages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/10 bg-background-subtle/40 p-6 text-center text-sm text-text-muted">
                        Nenhum estágio cadastrado. Configure os estágios do pipeline primeiro.
                      </div>
                    ) : (
                      <>
                        <div>
                          <h4 className="text-sm font-medium text-white mb-3">Selecione os estágios que o agente pode usar:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {stages.map((stage) => (
                              <label
                                key={stage.id}
                                className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
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
                                  <span className="text-xs text-text-muted mt-1 block">
                                    Status: {stage.status}
                                  </span>
                                </div>
                                {selectedStages.has(stage.id) && (
                                  <CheckCircle className="h-5 w-5 text-brand-primary" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>

                        {selectedStages.size > 0 && (
                          <div className="rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-4">
                            <div className="flex items-start gap-3">
                              <Sparkles className="h-5 w-5 text-brand-primary mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-white mb-2">Pronto para aplicar!</h4>
                                <p className="text-xs text-text-muted mb-3">
                                  Clique no botão abaixo para adicionar as instruções de Kanban ao prompt atual. 
                                  Depois, salve o prompt na aba "Editar Direto".
                                </p>
                                <Button
                                  onClick={handleApplyKanbanToPrompt}
                                  size="sm"
                                  className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90"
                                >
                                  <LayoutGrid className="h-4 w-4" />
                                  Aplicar ao Prompt
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Prompt Preview */}
          {hasPrompt && (
            <div className="rounded-xl border border-white/10 bg-background-muted/40 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Preview do Prompt</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-background-subtle/60 px-3 py-1.5 text-xs text-text-muted hover:text-white transition-colors"
                >
                  <Eye className="h-3 w-3" />
                  {showPreview ? 'Ocultar' : 'Visualizar'}
                </button>
              </div>
              {showPreview && (
                <div className="mt-3 rounded-lg border border-white/5 bg-background-subtle/60 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    {kanbanEnabled && kanbanPrompt && (
                      <span className="rounded-full bg-brand-primary/20 px-2 py-0.5 text-xs text-brand-secondary">
                        Kanban Ativado
                      </span>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-xs text-white font-mono max-h-96 overflow-y-auto">
                    {getFullPromptForPreview()}
                  </pre>
                  {kanbanEnabled && kanbanPrompt && (
                    <div className="mt-3 rounded-lg border border-brand-primary/30 bg-brand-primary/5 p-3">
                      <p className="text-xs text-brand-secondary">
                        <strong>Prompt Base:</strong> {directEditPrompt || generatedPrompt ? 'Configurado' : 'Não configurado'}
                      </p>
                      <p className="text-xs text-brand-secondary mt-1">
                        <strong>Função Kanban:</strong> Ativada com {selectedStages.size} estágio(s) selecionado(s)
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-background-muted/40 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            {hasPrompt && promptMode !== 'edit' && (
              <button
                onClick={handleClearPrompt}
                disabled={loading}
                className="rounded-lg border border-white/10 bg-background-subtle/60 px-4 py-2 text-sm text-text-muted hover:text-white transition-colors disabled:opacity-50"
              >
                Limpar Prompt
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              disabled={loading}
              className="text-text-muted hover:text-white"
            >
              Fechar
            </Button>
            {(promptMode === 'create' || promptMode === 'adjust') && (
              <Button
                onClick={handleCreateOrAdjustPrompt}
                disabled={loading || (promptMode === 'create' ? !canCreateSystem : !canAdjust)}
                className="gap-2 bg-brand-primary text-white hover:bg-brand-primary/90 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {promptMode === 'create' ? 'Criando...' : 'Ajustando...'}
                  </>
                ) : (
                  <>
                    {promptMode === 'create' ? (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Criar Prompt
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Ajustar Prompt
                      </>
                    )}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}