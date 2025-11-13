'use client'

import { Message, Conversation } from '@/types'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { Image, File, Volume2, Video, Download, CheckCheck, MapPin, ExternalLink, Reply, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import { useMemo, useState, useRef, useEffect } from 'react'
import AudioPlayer from './AudioPlayer'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '')

interface MessageBubbleProps {
  message: Message
  conversation?: Conversation | null
  allMessages?: Message[] // Lista de todas as mensagens para buscar a mensagem original
  onScrollToMessage?: (messageId: string) => void // Função para fazer scroll até uma mensagem específica
  onReply?: (message: Message) => void // Função para responder uma mensagem
  onEdit?: (message: Message) => void // Função para editar uma mensagem
  onDelete?: (message: Message) => void // Função para excluir uma mensagem
}

export default function MessageBubble({ 
  message, 
  conversation, 
  allMessages = [], 
  onScrollToMessage,
  onReply,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const isUser = message.senderType === 'USER'
  const [imageError, setImageError] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Verificar se a mensagem foi editada ou excluída
  const isEdited = !!message.editedAt
  const isDeleted = !!message.deletedAt
  
  // Buscar mensagem original se for uma resposta
  const quotedMessage = useMemo(() => {
    if (message.reply && message.replyMessageId && allMessages.length > 0) {
      return allMessages.find((m) => m.id === message.replyMessageId) || null
    }
    return null
  }, [message.reply, message.replyMessageId, allMessages])

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return ''
    return format(new Date(dateString), 'HH:mm', { locale: ptBR })
  }

  const resolveUrl = useMemo(() => {
    if (!message.contentUrl) {
      return null
    }
    if (message.contentUrl.startsWith('http://') || message.contentUrl.startsWith('https://')) {
      return message.contentUrl
    }
    return `${API_BASE_URL}${message.contentUrl.startsWith('/') ? '' : '/'}${message.contentUrl}`
  }, [message.contentUrl])

  const timeLabel = formatTime(message.timestamp || message.createdAt)

  const metaInfo = (
    <div className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
      <span>{timeLabel}</span>
      {isUser && <CheckCheck className="h-4 w-4 text-brand-primary" />}
    </div>
  )

  const renderContent = () => {
    switch (message.contentType) {
      case 'TEXT':
        return (
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm leading-tight whitespace-pre-wrap break-words">
              {message.contentText && message.contentText.trim().length > 0
                ? message.contentText
                : 'Mensagem sem conteúdo'}
            </p>
            {metaInfo}
          </div>
        )

      case 'IMAGE':
        return (
          <div className="relative">
            {imageError ? (
              <div className="flex h-48 w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-background-muted/60">
                <Image className="h-10 w-10 text-text-muted" />
              </div>
            ) : (
              <img
                src={resolveUrl || ''}
                alt="Imagem"
                onError={() => setImageError(true)}
                className="h-auto w-full max-w-[220px] cursor-pointer rounded-xl border border-white/10 object-cover"
                onClick={() => resolveUrl && window.open(resolveUrl, '_blank')}
              />
            )}
          </div>
        )

      case 'AUDIO':
        if (!resolveUrl) {
          return (
            <div className="flex w-full max-w-[240px] items-center gap-3 rounded-xl border border-white/10 bg-background-soft/70 px-3 py-2 text-text-muted">
              <Volume2 className="h-5 w-5" />
              <span className="text-xs">Áudio não disponível</span>
            </div>
          )
        }
        
        // Obter profilePictureURL do lead através da conversa
        // Apenas mostrar foto de perfil para mensagens recebidas (do lead)
        // Usar a conversa passada como prop ou a conversa da mensagem
        const leadProfilePicture = conversation?.lead?.profilePictureURL || message.conversation?.lead?.profilePictureURL
        const profilePictureURL = !isUser ? (leadProfilePicture || null) : null
        
        return (
          <div className="flex w-full max-w-[320px]">
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              isUser 
                ? 'bg-blue-500' 
                : 'bg-white dark:bg-gray-800'
            }`}>
              <AudioPlayer
                src={resolveUrl}
                profilePictureURL={profilePictureURL || undefined}
                className="w-full"
              />
            </div>
          </div>
        )

      case 'VIDEO':
        if (!resolveUrl) {
          return (
            <div className="flex w-full max-w-[240px] items-center gap-3 rounded-xl border border-white/10 bg-background-soft/70 px-3 py-2 text-text-muted">
              <Video className="h-5 w-5" />
              <span className="text-xs">Vídeo não disponível</span>
            </div>
          )
        }
        return (
          <div className="flex w-full max-w-[300px] flex-col gap-2 rounded-xl border border-white/10 bg-background-soft/70 overflow-hidden">
            <div className="relative">
              <video 
                controls 
                className="h-auto w-full max-w-full rounded-lg"
                preload="metadata"
                onError={(e) => {
                  console.error('Erro ao carregar vídeo:', resolveUrl, e)
                  const videoElement = e.target as HTMLVideoElement
                  if (videoElement.error) {
                    console.error('Código de erro do vídeo:', videoElement.error.code)
                    console.error('Mensagem de erro:', videoElement.error.message)
                  }
                }}
                onLoadedMetadata={() => {
                  console.log('Vídeo carregado com sucesso:', resolveUrl)
                }}
                onCanPlay={() => {
                  console.log('Vídeo pode ser reproduzido:', resolveUrl)
                }}
              >
                {/* Não especificar type, deixar o navegador detectar automaticamente */}
                <source src={resolveUrl} />
                Seu navegador não suporta vídeo.
              </video>
            </div>
            <a
              href={resolveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-brand-secondary hover:underline self-start px-3 pb-2"
              onClick={(e) => {
                e.stopPropagation()
                // Tentar fazer download, se não funcionar, abrir em nova aba
                const link = document.createElement('a')
                link.href = resolveUrl || ''
                link.download = resolveUrl?.split('/').pop() || 'video.mp4'
                link.target = '_blank'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                e.preventDefault()
              }}
            >
              <Download className="h-3 w-3" />
              <span>Baixar vídeo</span>
            </a>
          </div>
        )

      case 'DOCUMENT':
        return (
          <div className="flex w-full max-w-[240px] items-center gap-3 rounded-xl border border-white/10 bg-background-soft/70 px-3 py-3">
            <File className="h-8 w-8 flex-shrink-0 text-brand-secondary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {message.contentText || 'Documento'}
              </p>
              {resolveUrl && (
                <a
                  href={resolveUrl}
                  download
                  className="mt-1 flex items-center gap-1 text-xs text-brand-secondary hover:underline"
                >
                  <Download className="h-3 w-3" />
                  <span>Baixar arquivo</span>
                </a>
              )}
            </div>
          </div>
        )

      case 'LOCATION': {
        const lat = message.latitude
        const lng = message.longitude
        
        if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
          return (
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm leading-tight whitespace-pre-wrap break-words">
                {message.contentText || 'Localização não disponível'}
              </p>
              {metaInfo}
            </div>
          )
        }
        
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
        const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`
        
        // Usar OpenStreetMap para imagem estática do mapa
        const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=300x200&markers=${lat},${lng},red-pushpin`
        
        return (
          <div className="flex w-full max-w-[300px] flex-col gap-2 rounded-xl border border-white/10 bg-background-soft/70 overflow-hidden">
            <div className="relative h-48 w-full">
              <img
                src={staticMapUrl}
                alt="Localização"
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Fallback para imagem alternativa se o mapa não carregar
                  const target = e.target as HTMLImageElement
                  target.src = `https://via.placeholder.com/300x200?text=Mapa+${lat.toFixed(4)},+${lng.toFixed(4)}`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <MapPin className="h-8 w-8 text-red-500 drop-shadow-lg" />
              </div>
            </div>
            <div className="px-3 pb-3">
              {/* Exibir nome do local se disponível no contentText */}
              {message.contentText && (
                <div className="mb-2">
                  {/* O contentText pode conter: nome\nlatitude, longitude\nURL */}
                  {message.contentText.includes('\n') ? (
                    <div className="space-y-1">
                      {message.contentText.split('\n').map((line, index) => {
                        // Primeira linha é o nome
                        if (index === 0) {
                          return (
                            <p key={index} className="text-sm font-medium text-white">
                              {line}
                            </p>
                          )
                        }
                        // Segunda linha são as coordenadas
                        if (index === 1 && line.includes(',')) {
                          return (
                            <p key={index} className="text-xs text-text-muted">
                              {line}
                            </p>
                          )
                        }
                        // Terceira linha pode ser a URL
                        if (index === 2 && (line.startsWith('http://') || line.startsWith('https://'))) {
                          return (
                            <a
                              key={index}
                              href={line}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-secondary hover:underline break-all"
                            >
                              {line}
                            </a>
                          )
                        }
                        return null
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-white">{message.contentText}</p>
                  )}
                </div>
              )}
              
              {/* Coordenadas sempre visíveis */}
              <p className="mb-2 text-xs text-text-muted">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-brand-primary/20 px-2 py-1 text-xs text-brand-secondary hover:bg-brand-primary/30 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Google Maps</span>
                </a>
                <a
                  href={openStreetMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-brand-primary/20 px-2 py-1 text-xs text-brand-secondary hover:bg-brand-primary/30 transition"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>OpenStreetMap</span>
                </a>
              </div>
            </div>
          </div>
        )
      }

      default:
        return (
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm leading-tight whitespace-pre-wrap break-words">
              {message.contentText}
            </p>
            {metaInfo}
          </div>
        )
    }
  }

  // Renderizar seção de resposta (reply) se a mensagem for uma resposta
  const renderReply = () => {
    if (!message.reply) {
      return null
    }

    // Usar o texto da mensagem original se encontrada, senão usar replyText
    const replyText = quotedMessage?.contentText || message.replyText || 'Mensagem original não encontrada'
    const replySenderName = quotedMessage?.senderType === 'USER' 
      ? 'Você' 
      : (quotedMessage?.conversation?.lead?.name || message.conversation?.lead?.name || 'Lead')
    
    // Verificar se temos um ID da mensagem original para fazer scroll
    // Priorizar o ID interno (replyMessageId), mas também tentar pelo messageId do WhatsApp se necessário
    const originalMessageId = quotedMessage?.id || message.replyMessageId || null
    const originalWhatsAppMessageId = quotedMessage?.messageId || null
    const canScrollToOriginal = (originalMessageId || originalWhatsAppMessageId) && onScrollToMessage

    const handleReplyClick = () => {
      if (canScrollToOriginal && onScrollToMessage) {
        // Tentar primeiro pelo ID interno, depois pelo messageId do WhatsApp
        const idToScroll = originalMessageId || originalWhatsAppMessageId
        if (idToScroll) {
          onScrollToMessage(idToScroll)
        }
      }
    }

    return (
      <div 
        className={`mb-2 border-l-3 ${
          isUser 
            ? 'border-blue-400 bg-blue-500/10 pl-3 pr-2 py-1.5 rounded-l-sm' 
            : 'border-gray-400 bg-gray-500/10 pl-3 pr-2 py-1.5 rounded-l-sm'
        } ${canScrollToOriginal ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onClick={canScrollToOriginal ? handleReplyClick : undefined}
        title={canScrollToOriginal ? 'Clique para ver a mensagem original' : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Reply className={`h-3 w-3 ${isUser ? 'text-blue-300' : 'text-gray-400'}`} />
          <span className={`text-xs font-medium ${
            isUser ? 'text-blue-200' : 'text-gray-400'
          }`}>
            {replySenderName}
          </span>
          {canScrollToOriginal && (
            <span className={`text-[10px] ${isUser ? 'text-blue-300' : 'text-gray-400'}`}>
              (clique para ver)
            </span>
          )}
        </div>
        <p className={`text-xs leading-tight line-clamp-2 ${
          isUser ? 'text-blue-100' : 'text-gray-300'
        }`}>
          {replyText.length > 100 ? `${replyText.substring(0, 100)}...` : replyText}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[90%] rounded-2xl border px-5 py-3 text-sm shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] sm:max-w-[80%] lg:max-w-[70%] relative ${
          isUser
            ? 'rounded-br-md border-brand-primary/40 bg-gradient-to-br from-brand-primary/25 via-brand-primary/10 to-transparent text-white backdrop-blur-sm'
            : 'rounded-bl-md border-white/10 bg-background-card/85 text-text-primary backdrop-blur-sm'
        } ${isDeleted ? 'opacity-40 grayscale' : isEdited ? 'opacity-75' : ''}`}
      >
        {!isUser && message.sender && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {message.sender.name || message.sender.email}
          </p>
        )}
        
        {/* Indicadores de edição/exclusão */}
        {(isEdited || isDeleted) && (
          <div className="mb-1 flex items-center gap-1 text-[10px] text-text-muted">
            {isDeleted && (
              <span className="text-red-400">🗑️ Esta mensagem foi excluída</span>
            )}
            {isEdited && !isDeleted && (
              <span className="text-yellow-400">✏️ Editada</span>
            )}
          </div>
        )}
        
        {/* Menu de ações (botão de três pontos) */}
        {isUser && (onReply || onEdit || onDelete) && (
          <div className="absolute right-2 top-2" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10"
              title="Mais opções"
            >
              <MoreVertical className="h-4 w-4 text-text-muted" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 z-50 min-w-[150px] rounded-lg border border-white/10 bg-background-card/95 shadow-lg backdrop-blur-sm">
                <div className="py-1">
                  {onReply && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onReply(message)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-white/10 transition-colors"
                    >
                      <Reply className="h-4 w-4" />
                      <span>Responder</span>
                    </button>
                  )}
                  {onEdit && isUser && message.contentType === 'TEXT' && !isDeleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(message)
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-white/10 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Editar</span>
                    </button>
                  )}
                  {onDelete && isUser && !isDeleted && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
                          onDelete(message)
                        }
                        setShowMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          {renderReply()}
          {renderContent()}
          {message.contentType !== 'TEXT' && (
            <div className="flex justify-end">{metaInfo}</div>
          )}
        </div>
      </div>
    </div>
  )
}

