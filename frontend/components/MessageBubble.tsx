'use client'

import { Message, Conversation } from '@/types'
import { format } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { Image, File, Volume2, Video, Download, CheckCheck, MapPin, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'
import AudioPlayer from './AudioPlayer'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '')

interface MessageBubbleProps {
  message: Message
  conversation?: Conversation | null
}

export default function MessageBubble({ message, conversation }: MessageBubbleProps) {
  const isUser = message.senderType === 'USER'
  const [imageError, setImageError] = useState(false)

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

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl border px-5 py-3 text-sm shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)] sm:max-w-[80%] lg:max-w-[70%] ${
          isUser
            ? 'rounded-br-md border-brand-primary/40 bg-gradient-to-br from-brand-primary/25 via-brand-primary/10 to-transparent text-white backdrop-blur-sm'
            : 'rounded-bl-md border-white/10 bg-background-card/85 text-text-primary backdrop-blur-sm'
        }`}
      >
        {!isUser && message.sender && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {message.sender.name || message.sender.email}
          </p>
        )}
        <div className="space-y-2">
          {renderContent()}
          {message.contentType !== 'TEXT' && (
            <div className="flex justify-end">{metaInfo}</div>
          )}
        </div>
      </div>
    </div>
  )
}

