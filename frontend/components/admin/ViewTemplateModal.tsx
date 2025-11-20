'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ViewTemplateModalProps {
  template: any
  onClose: () => void
  onEdit: () => void
}

export default function ViewTemplateModal({ template, onClose, onEdit }: ViewTemplateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background-card p-8">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-white">{template.name}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-muted hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white">Informações</h4>
            
            {template.description && (
              <div>
                <label className="text-sm font-medium text-text-muted">Descrição</label>
                <p className="mt-1 text-white">{template.description}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {template.category && (
                <div>
                  <label className="text-sm font-medium text-text-muted">Categoria</label>
                  <p className="mt-1 text-white">{template.category}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-text-muted">Ícone</label>
                <p className="mt-1 text-white">{template.icon || 'bot'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-text-muted">Tipo</label>
                <p className="mt-1 text-white">{template.isGlobal ? 'Global' : 'Específico'}</p>
              </div>
            </div>
          </div>

          {/* Variáveis */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white">
              Variáveis ({Object.keys(template.variables || {}).length})
            </h4>
            
            {Object.keys(template.variables || {}).length === 0 ? (
              <p className="text-sm text-text-muted">Nenhuma variável configurada</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(template.variables).map(([name, config]: [string, any]) => (
                  <div
                    key={name}
                    className="rounded-xl border border-white/10 bg-background-muted/60 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div>
                        <h5 className="font-semibold text-white">{config.label || name}</h5>
                        <p className="text-xs text-text-muted">
                          &#123;&#123;{name}&#125;&#125; • {config.type}
                          {config.required && <span className="text-red-400"> • Obrigatório</span>}
                        </p>
                      </div>
                    </div>

                    {config.description && (
                      <p className="mb-2 text-sm text-text-muted">{config.description}</p>
                    )}

                    {config.default && (
                      <div className="mt-2 rounded bg-white/5 p-2 text-xs text-text-muted">
                        <span className="font-semibold">Padrão:</span> {config.default}
                      </div>
                    )}

                    {config.options && config.options.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs font-semibold text-text-muted">Opções: </span>
                        <span className="text-xs text-text-muted">
                          {config.options.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JSON do Workflow */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-white">JSON do Workflow</h4>
              {template.n8nWorkflowData && (
                <div className="text-xs text-text-muted">
                  {template.n8nWorkflowData.nodes?.length || 0} nodes •{' '}
                  {Object.keys(template.n8nWorkflowData.connections || {}).length} conexões
                </div>
              )}
            </div>
            
            {template.n8nWorkflowData ? (
              <div className="space-y-3">
                {/* Resumo do Workflow */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-background-muted/60 p-3">
                    <p className="text-xs text-text-muted">Nome do Workflow</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {template.n8nWorkflowData.name || 'Sem nome'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-background-muted/60 p-3">
                    <p className="text-xs text-text-muted">Status</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {template.n8nWorkflowData.active ? 'Ativo' : 'Inativo'}
                    </p>
                  </div>
                </div>

                {/* Lista de Nodes */}
                {template.n8nWorkflowData.nodes && Array.isArray(template.n8nWorkflowData.nodes) && (
                  <div className="rounded-xl border border-white/10 bg-background-muted/60 p-4">
                    <p className="mb-2 text-xs font-semibold text-text-muted">Nodes do Workflow</p>
                    <div className="space-y-2">
                      {template.n8nWorkflowData.nodes.slice(0, 10).map((node: any, index: number) => (
                        <div
                          key={index}
                          className="rounded-lg border border-white/5 bg-background-card/60 px-3 py-2 text-xs"
                        >
                          <p className="font-semibold text-white">
                            {node.name || `Node ${index + 1}`}
                          </p>
                          <p className="text-text-muted">
                            {node.type || 'Sem tipo'}
                          </p>
                        </div>
                      ))}
                      {template.n8nWorkflowData.nodes.length > 10 && (
                        <p className="text-xs text-text-muted">
                          ... e mais {template.n8nWorkflowData.nodes.length - 10} nodes
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* JSON Completo (colapsável) */}
                <details className="rounded-xl border border-white/10 bg-background-muted p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-white">
                    Ver JSON Completo
                  </summary>
                  <div className="mt-4 max-h-96 overflow-auto">
                    <pre className="text-xs text-white">
                      {JSON.stringify(template.n8nWorkflowData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-background-muted/40 p-6 text-center">
                <p className="text-sm text-text-muted">JSON do workflow não disponível</p>
              </div>
            )}
          </div>

          {/* Informações de Criação */}
          <div className="rounded-xl border border-white/10 bg-background-muted/40 p-4 text-xs text-text-muted">
            <p>
              <strong>ID:</strong> {template.id}
            </p>
            <p>
              <strong>Criado em:</strong> {new Date(template.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="mt-8 flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
          >
            Fechar
          </Button>
          <Button
            onClick={onEdit}
            className="flex-1 bg-brand-primary text-white"
          >
            Editar Template
          </Button>
        </div>
      </div>
    </div>
  )
}

