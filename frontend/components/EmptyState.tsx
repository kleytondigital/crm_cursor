'use client'

import { MessageCircle } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-background-subtle/60">
      <div className="rounded-3xl border border-dashed border-white/10 bg-background-muted/40 px-10 py-12 text-center shadow-inner-glow">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/15 text-brand-secondary">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-white">Selecione uma conversa</h2>
        <p className="text-sm text-text-muted">
          Escolha um lead na barra lateral para visualizar o histórico e responder com agilidade.
        </p>
      </div>
    </div>
  )
}

