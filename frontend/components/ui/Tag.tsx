'use client'

import { ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  variant?: 'default' | 'stage' | 'user' | 'department' | 'priority' | 'priorityLow' | 'priorityNormal' | 'priorityHigh' | 'bot'
  color?: string
  className?: string
  title?: string
}

const variantStyles = {
  default: 'bg-white/5 text-text-muted border-white/10',
  stage: 'bg-opacity-20 border text-white',
  user: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  department: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  priority: 'bg-opacity-20 border text-white',
  priorityLow: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  priorityNormal: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  priorityHigh: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  bot: 'bg-brand-primary/20 text-brand-secondary border-brand-primary/30',
}

export default function Tag({
  children,
  variant = 'default',
  color,
  className = '',
  title,
}: TagProps) {
  const baseStyles = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] md:text-[11px] font-medium border truncate max-w-[120px] leading-tight'
  
  const variantStyle = variantStyles[variant]
  
  const style = color && variant === 'stage' ? {
    backgroundColor: `${color}20`,
    borderColor: color,
    color: color,
  } : undefined

  return (
    <span
      className={`${baseStyles} ${variantStyle} ${className}`}
      style={style}
      title={title}
    >
      {children}
    </span>
  )
}

