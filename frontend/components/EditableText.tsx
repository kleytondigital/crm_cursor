'use client'

import { useState, useRef, useEffect } from 'react'
import { Edit2, Check, X } from 'lucide-react'

interface EditableTextProps {
  value: string
  onSave: (value: string) => Promise<void>
  placeholder?: string
  className?: string
  labelClassName?: string
  inputClassName?: string
  maxLength?: number
  validate?: (value: string) => boolean | string
  getEditValue?: (displayValue: string) => string // Função para transformar valor ao entrar em edição
  formatDisplayValue?: (value: string) => string // Função para formatar valor ao exibir
}

export default function EditableText({
  value,
  onSave,
  placeholder = 'Digite...',
  className = '',
  labelClassName = '',
  inputClassName = '',
  maxLength,
  validate,
  getEditValue,
  formatDisplayValue,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isHovered, setIsHovered] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Valor formatado para exibição
  const displayValue = formatDisplayValue ? formatDisplayValue(value) : value

  // Sincronizar valor quando prop mudar
  useEffect(() => {
    if (isEditing) {
      // Se estiver editando, manter o valor de edição
      return
    }
    // Se não estiver editando, sincronizar com o valor atual
    const newValue = getEditValue ? getEditValue(displayValue) : displayValue
    setEditValue(newValue)
  }, [value, displayValue, isEditing, getEditValue])

  // Focar no input quando entrar em modo de edição
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    // Ao entrar em edição, usar valor transformado se houver função
    const initialEditValue = getEditValue ? getEditValue(displayValue) : displayValue
    setEditValue(initialEditValue)
    setError(null)
    setIsEditing(true)
  }

  const handleCancel = () => {
    // Ao cancelar, resetar para o valor transformado
    const resetValue = getEditValue ? getEditValue(displayValue) : displayValue
    setEditValue(resetValue)
    setError(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    const trimmedValue = editValue.trim()

    // Validação
    if (validate) {
      const validationResult = validate(trimmedValue)
      if (validationResult !== true) {
        setError(typeof validationResult === 'string' ? validationResult : 'Valor inválido')
        return
      }
    }

    // Comparar com o valor original (sem formatação para telefone)
    const originalValue = getEditValue ? getEditValue(displayValue) : displayValue
    if (trimmedValue === originalValue.trim()) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(trimmedValue)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={`relative flex items-center gap-1 md:gap-2 min-w-0 ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          maxLength={maxLength}
          placeholder={placeholder}
          className={`flex-1 min-w-0 bg-background-subtle border border-brand-secondary/40 rounded-lg px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary/50 disabled:opacity-50 ${inputClassName}`}
          style={{ maxWidth: '100%' }}
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 md:p-1.5 rounded-lg bg-brand-secondary/20 hover:bg-brand-secondary/30 text-brand-secondary transition-colors disabled:opacity-50 flex-shrink-0"
          title="Salvar"
        >
          <Check className="h-3 w-3 md:h-4 md:w-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 md:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted transition-colors disabled:opacity-50 flex-shrink-0"
          title="Cancelar"
        >
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </button>
        {error && (
          <span className="absolute -bottom-5 left-0 text-[10px] md:text-xs text-rose-400 whitespace-nowrap max-w-full truncate">{error}</span>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative group flex items-center gap-1 md:gap-2 min-w-0 max-w-full ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
    >
      <span className={`${labelClassName} min-w-0 flex-1`} style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayValue || placeholder}</span>
      {isHovered && (
        <button
          onClick={handleStartEdit}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-brand-secondary transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Editar"
        >
          <Edit2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
        </button>
      )}
    </div>
  )
}

