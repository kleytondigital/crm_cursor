'use client'

import { useChat } from '@/contexts/ChatContext'
import {
  Send,
  Plus,
  Smile,
  Image as ImageIcon,
  Mic,
  StopCircle,
  Trash2,
  Check,
  FileText,
  Camera,
  Calendar,
  X,
  Reply,
  Edit2,
} from 'lucide-react'
import {
  useState,
  useRef,
  KeyboardEvent,
  useCallback,
  useEffect,
} from 'react'
import type { ComponentType } from 'react'
import { Message } from '@/types'
import { messagesAPI } from '@/lib/api'

const AUDIO_MIME_OPTIONS = [
  { mime: 'audio/ogg; codecs=opus', extension: '.ogg' },
  { mime: 'audio/mpeg', extension: '.mp3' },
  { mime: 'audio/mp3', extension: '.mp3' },
]
const AUDIO_FALLBACK = { mime: 'audio/webm', extension: '.webm' }

interface MessageInputProps {
  onScheduleClick?: () => void
  replyTo?: Message | null
  onReplyCancel?: () => void
  editMessage?: Message | null
  onEditCancel?: () => void
  onEditSuccess?: () => void
}

export default function MessageInput({ 
  onScheduleClick, 
  replyTo, 
  onReplyCancel,
  editMessage,
  onEditCancel,
  onEditSuccess,
}: MessageInputProps) {
  const { selectedConversation, sendMessage } = useChat()
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const dataRequestIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordingFormatRef = useRef<(typeof AUDIO_MIME_OPTIONS)[number] | null>(null)
  const attachmentsRef = useRef<HTMLDivElement>(null)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioPreview, setAudioPreview] = useState<{ url: string; file: File } | null>(null)
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [showAttachments, setShowAttachments] = useState(false)

  if (!selectedConversation) {
    return null
  }

  // Atualizar texto quando editMessage mudar
  useEffect(() => {
    if (editMessage) {
      setText(editMessage.contentText || '')
    } else if (!replyTo) {
      // Limpar texto apenas se não for resposta e não for edição
      setText('')
    }
  }, [editMessage, replyTo])

  const handleSend = useCallback(async () => {
    if (text.trim()) {
      // Se estiver editando, enviar edição
      if (editMessage && editMessage.messageId && selectedConversation) {
        try {
          const leadPhone = selectedConversation.lead.phone
          
          await messagesAPI.edit({
            idMessage: editMessage.messageId,
            phone: leadPhone,
            session: '', // Será obtido automaticamente pelo backend
            Texto: text.trim(),
          })

          setText('')
          onEditCancel?.()
          onEditSuccess?.()
        } catch (error: any) {
          console.error('Erro ao editar mensagem:', error)
          alert(error.response?.data?.message || 'Erro ao editar mensagem')
        }
        return
      }
      
      // Se for resposta, incluir replyTo e action=reply
      const replyToId = replyTo?.messageId || null
      await sendMessage(text.trim(), 'TEXT', undefined, replyToId || undefined, replyToId ? 'reply' : undefined)
      setText('')
      onReplyCancel?.()
    }
  }, [sendMessage, text, replyTo, editMessage, selectedConversation, onReplyCancel, onEditCancel, onEditSuccess])

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (file: File) => {
    try {
      const fileType = file.type.split('/')[0]
      
      // Se estiver respondendo, incluir replyTo
      const replyToId = replyTo?.messageId || null

      if (fileType === 'image') {
        await sendMessage('', 'IMAGE', file, replyToId || undefined, replyToId ? 'reply' : undefined)
      } else if (fileType === 'audio') {
        await sendMessage('', 'AUDIO', file, replyToId || undefined, replyToId ? 'reply' : undefined)
      } else if (fileType === 'video') {
        await sendMessage('', 'VIDEO', file, replyToId || undefined, replyToId ? 'reply' : undefined)
      } else {
        await sendMessage(file.name, 'DOCUMENT', file, replyToId || undefined, replyToId ? 'reply' : undefined)
      }
      
      // Limpar resposta após enviar mídia
      if (replyToId) {
        onReplyCancel?.()
      }
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error)
      throw error
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await handleFileSelect(file)
      } catch (error) {
        console.error('Erro ao enviar imagem/vídeo:', error)
      }
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await handleFileSelect(file)
      } catch (error) {
        console.error('Erro ao enviar foto da câmera:', error)
      }
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        await handleFileSelect(file)
      } catch (error) {
        console.error('Erro ao enviar documento:', error)
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current)
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview.url)
      }
    }
  }, [audioPreview])

  useEffect(() => {
    if (!showAttachments) {
      return
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        attachmentsRef.current &&
        !attachmentsRef.current.contains(event.target as Node)
      ) {
        setShowAttachments(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showAttachments])

  const handleAudioRecord = async () => {
    try {
      if (isRecording) {
        mediaRecorderRef.current?.stop()
        return
      }

      if (audioPreview) {
        URL.revokeObjectURL(audioPreview.url)
        setAudioPreview(null)
      }

      console.log('🎤 Solicitando permissão de microfone...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })

      console.log('✅ Permissão concedida. Stream ativo:', stream.active)
      console.log('📊 Tracks de áudio:', stream.getAudioTracks().length)

      // Verificar se o stream tem tracks de áudio
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        throw new Error('Nenhuma track de áudio encontrada no stream')
      }

      console.log('🎵 Track de áudio:', audioTracks[0].label, 'Estado:', audioTracks[0].readyState)

      // Tentar encontrar um formato suportado
      const selectedFormat = AUDIO_MIME_OPTIONS.find((option) => {
        const supported = MediaRecorder.isTypeSupported(option.mime)
        console.log(`📝 Formato ${option.mime}: ${supported ? '✅ suportado' : '❌ não suportado'}`)
        return supported
      })

      const formatToUse = selectedFormat ?? AUDIO_FALLBACK
      console.log('🎯 Formato escolhido:', formatToUse.mime)

      if (!MediaRecorder.isTypeSupported(formatToUse.mime)) {
        setRecordingError(
          'Não foi possível iniciar a gravação. Verifique as permissões de áudio do navegador.',
        )
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      // Criar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: formatToUse.mime,
      })

      recordedChunksRef.current = []
      recordingFormatRef.current = formatToUse

      console.log('📹 MediaRecorder criado. Estado:', mediaRecorder.state)

      mediaRecorder.ondataavailable = (event) => {
        console.log('📦 ondataavailable disparado. Tamanho:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          console.log('✅ Chunk de áudio capturado:', event.data.size, 'bytes')
          recordedChunksRef.current.push(event.data)
        } else {
          console.warn('⚠️ Chunk vazio recebido')
        }
      }

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ Erro no MediaRecorder:', event.error)
        setRecordingError('Erro durante a gravação: ' + event.error?.message)
      }

      mediaRecorder.onstart = () => {
        console.log('▶️ Gravação iniciada')
      }

      mediaRecorder.onstop = () => {
        console.log('⏹️ Gravação finalizada. Total de chunks:', recordedChunksRef.current.length)
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }
        
        if (dataRequestIntervalRef.current) {
          clearInterval(dataRequestIntervalRef.current)
          dataRequestIntervalRef.current = null
        }

        if (recordedChunksRef.current.length === 0) {
          console.error('❌ Nenhum chunk de áudio foi capturado')
          console.error('💡 Dica: Verifique se o microfone está funcionando e se o volume está alto')
          setRecordingError('Falha ao capturar áudio. Verifique o volume do microfone.')
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
          setIsRecording(false)
          setRecordingTime(0)
          return
        }

        const format = recordingFormatRef.current ?? AUDIO_FALLBACK
        const blob = new Blob(recordedChunksRef.current, { type: format.mime })
        
        console.log('📦 Blob de áudio criado:', blob.size, 'bytes, tipo:', blob.type)
        
        if (blob.size === 0) {
          console.error('❌ Blob de áudio vazio')
          setRecordingError('Falha ao criar arquivo de áudio. Tente novamente.')
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
          setIsRecording(false)
          setRecordingTime(0)
          return
        }

        const file = new File([blob], `audio-${Date.now()}${format.extension}`, {
          type: format.mime,
        })
        const url = URL.createObjectURL(blob)
        
        console.log('✅ Arquivo de áudio criado:', file.name, file.size, 'bytes')
        setAudioPreview({ url, file })

        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        recordingFormatRef.current = null
        setIsRecording(false)
        setRecordingTime(0)
      }

      mediaRecorderRef.current = mediaRecorder
      
      // Iniciar gravação e forçar coleta periódica
      console.log('🚀 Iniciando gravação...')
      mediaRecorder.start()
      
      console.log('✅ Gravação iniciada com formato:', formatToUse.mime)
      console.log('📊 Estado do MediaRecorder:', mediaRecorder.state)
      
      // Forçar requestData a cada 1 segundo para garantir captura
      dataRequestIntervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          console.log('📡 Solicitando dados do MediaRecorder...')
          mediaRecorder.requestData()
        }
      }, 1000)
      
      setRecordingError(null)
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error: any) {
      console.error('❌ Erro ao gravar áudio:', error)
      console.error('Detalhes do erro:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })
      
      let errorMessage = 'Não foi possível iniciar a gravação.'
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão de microfone negada. Por favor, permita o acesso ao microfone.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhum microfone encontrado. Verifique se há um microfone conectado.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Microfone está sendo usado por outro aplicativo. Feche outros aplicativos que possam estar usando o microfone.'
      } else {
        errorMessage = `Erro: ${error.message}`
      }
      
      setRecordingError(errorMessage)
      setIsRecording(false)
      recordingFormatRef.current = null
      
      if (dataRequestIntervalRef.current) {
        clearInterval(dataRequestIntervalRef.current)
        dataRequestIntervalRef.current = null
      }
      
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    }
  }

  type AttachmentOption = {
    key: 'document' | 'media' | 'camera' | 'audio'
    label: string
    icon: ComponentType<{ className?: string }>
    action?: () => void
  }

  const attachmentOptions: AttachmentOption[] = [
    {
      key: 'document',
      label: 'Documento',
      icon: FileText,
      action: () => fileInputRef.current?.click(),
    },
    {
      key: 'media',
      label: 'Fotos e vídeos',
      icon: ImageIcon,
      action: () => imageInputRef.current?.click(),
    },
    {
      key: 'camera',
      label: 'Câmera',
      icon: Camera,
      action: () => cameraInputRef.current?.click(),
    },
    {
      key: 'audio',
      label: 'Áudio',
      icon: Mic,
      action: () => handleAudioRecord(),
    },
  ]

  const handleAttachmentSelect = (key: AttachmentOption['key']) => {
    const option = attachmentOptions.find((item) => item.key === key)
    if (!option) {
      return
    }

    setShowAttachments(false)
    option.action?.()
  }

  const handleSubmitRecordedAudio = async () => {
    if (!audioPreview) {
      return
    }
    
    // Se estiver respondendo, incluir replyTo
    const replyToId = replyTo?.messageId || null
    await sendMessage('', 'AUDIO', audioPreview.file, replyToId || undefined, replyToId ? 'reply' : undefined)
    
    URL.revokeObjectURL(audioPreview.url)
    setAudioPreview(null)
    
    // Limpar resposta após enviar áudio
    if (replyToId) {
      onReplyCancel?.()
    }
  }

  const handleDiscardRecording = () => {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url)
      setAudioPreview(null)
    }
    setRecordingError(null)
  }

  const formattedTime = `${String(Math.floor(recordingTime / 60)).padStart(
    2,
    '0',
  )}:${String(recordingTime % 60).padStart(2, '0')}`

  const hasText = text.trim().length > 0

  const handlePrimaryAction = () => {
    if (isRecording) {
      handleAudioRecord()
      return
    }

    if (hasText) {
      handleSend()
    } else {
      handleAudioRecord()
    }
  }

  // Hook para ajustar posição quando teclado aparecer (mobile)
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) return

    const handleViewportChange = () => {
      const viewport = window.visualViewport
      if (!viewport) return

      // Encontrar o container do input
      const inputContainer = document.querySelector('[data-message-input-container]') as HTMLElement
      const chatArea = inputContainer?.closest('[data-chat-area]') as HTMLElement
      
      if (inputContainer && chatArea) {
        const viewportBottom = viewport.height + viewport.offsetTop
        const windowHeight = window.innerHeight
        const keyboardHeight = Math.max(0, windowHeight - viewportBottom)

        const threshold = 150 // Threshold para considerar teclado visível
        
        if (keyboardHeight > threshold) {
          // Teclado visível - scroll para manter input visível
          document.body.classList.add('keyboard-visible')
          
          // Scroll suave para manter input visível após um delay
          setTimeout(() => {
            const inputFooter = inputContainer?.parentElement as HTMLElement
            if (inputFooter) {
              inputFooter.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
          }, 200)
        } else {
          // Teclado oculto - voltar ao normal
          document.body.classList.remove('keyboard-visible')
        }
      }
    }

    const viewport = window.visualViewport
    if (viewport) {
      viewport.addEventListener('resize', handleViewportChange)
      viewport.addEventListener('scroll', handleViewportChange)
      
      // Trigger inicial
      setTimeout(handleViewportChange, 100)
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
        window.visualViewport.removeEventListener('scroll', handleViewportChange)
      }
    }
  }, [selectedConversation])

  return (
    <div className="flex flex-col gap-2 md:gap-3 w-full max-w-full overflow-hidden" data-message-input-container>
      {audioPreview && (
        <div className="flex items-center gap-2 md:gap-4 rounded-2xl border border-brand-primary/30 bg-[#d9fdd3] px-3 md:px-4 py-2 md:py-3 text-sm text-black shadow-inner">
          <audio controls src={audioPreview.url} className="max-w-xs flex-1" />
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleSubmitRecordedAudio}
              className="flex items-center gap-1 rounded-full bg-brand-primary px-2 md:px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-primary/90"
            >
              <Check className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
            <button
              onClick={handleDiscardRecording}
              className="flex items-center gap-1 rounded-full border border-black/20 px-2 md:px-3 py-1 text-xs font-semibold text-black/80 transition hover:border-black/40 hover:text-black"
            >
              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Descartar</span>
            </button>
          </div>
        </div>
      )}

      {recordingError && (
        <p className="text-xs text-brand-danger/80 px-2">{recordingError}</p>
      )}

      <div className="flex items-end gap-2 md:gap-3 w-full">
        {/* Timer de gravação visual */}
        {isRecording && (
          <div className="flex items-center gap-2 md:gap-3 rounded-full border border-red-500/50 bg-red-500/10 px-3 md:px-4 py-1.5 md:py-2 animate-pulse flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs md:text-sm font-mono font-semibold text-red-400">
                {formattedTime}
              </span>
            </div>
            <span className="text-[10px] md:text-xs text-text-muted hidden sm:inline">Gravando...</span>
          </div>
        )}

        <div className="flex flex-1 items-center gap-1 md:gap-1.5 md:gap-2 rounded-full border border-white/10 bg-background-muted/70 px-2 md:px-4 py-1.5 md:py-2 shadow-inner-glow min-w-0 relative max-w-full">
          {onScheduleClick && !isRecording && (
            <button
              type="button"
              onClick={onScheduleClick}
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-brand-secondary transition hover:bg-brand-secondary/20 hover:text-brand-secondary flex-shrink-0"
              title="Agendar Mensagem"
            >
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          )}
          <div className="relative flex-shrink-0" ref={attachmentsRef}>
            <button
              type="button"
              onClick={() => setShowAttachments((prev) => !prev)}
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-text-muted transition hover:bg-white/10 hover:text-white"
              title="Anexar"
            >
              <Plus className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {showAttachments && (
              <div 
                className="absolute bottom-full left-0 mb-2 z-[100] w-60 rounded-2xl border border-white/10 bg-background-card/95 p-2 shadow-glow backdrop-blur-xl" 
                style={{ zIndex: 100 }}
                onClick={(e) => e.stopPropagation()}
              >
                <ul className="flex flex-col gap-1">
                  {onScheduleClick && (
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachments(false)
                          onScheduleClick()
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/5"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <span>Agendar Mensagem</span>
                      </button>
                    </li>
                  )}
                  {attachmentOptions.map((option) => {
                    const Icon = option.icon
                    return (
                      <li key={option.key}>
                        <button
                          type="button"
                          onClick={() => handleAttachmentSelect(option.key)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/5"
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary/10 text-brand-secondary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>{option.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isRecording}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleCameraChange}
              className="hidden"
              disabled={isRecording}
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              disabled={isRecording}
            />
          </div>

          {!isRecording && (
            <button
              type="button"
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full text-text-muted transition hover:bg-white/10 hover:text-white flex-shrink-0"
              title="Emojis"
            >
              <Smile className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          )}

          {/* Indicador de resposta/edição */}
          {(replyTo || editMessage) && !isRecording && (
            <div className="absolute bottom-full left-0 right-0 mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-2 md:px-3 py-1.5 md:py-2 text-xs z-10">
              {editMessage ? (
                <>
                  <Edit2 className="h-3 w-3 text-yellow-400 flex-shrink-0" />
                  <span className="flex-1 text-text-muted truncate">
                    Editando: {editMessage.contentText?.substring(0, 40)}
                    {editMessage.contentText && editMessage.contentText.length > 40 ? '...' : ''}
                  </span>
                </>
              ) : replyTo ? (
                <>
                  <Reply className="h-3 w-3 text-blue-400 flex-shrink-0" />
                  <span className="flex-1 text-text-muted truncate">
                    Respondendo: {replyTo.contentText?.substring(0, 40)}
                    {replyTo.contentText && replyTo.contentText.length > 40 ? '...' : ''}
                  </span>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onEditCancel?.()
                  onReplyCancel?.()
                  setText('')
                }}
                className="rounded-full p-1 hover:bg-white/10 transition-colors flex-shrink-0"
                title="Cancelar"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              // Ajustar altura automaticamente
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            onKeyPress={handleKeyPress}
            onFocus={(e) => {
              // Ajustar altura quando focar
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            placeholder={editMessage ? "Digite..." : replyTo ? "Digite..." : "Digite uma mensagem..."}
            rows={1}
            className="flex-1 min-w-0 max-h-32 resize-none border-0 bg-transparent text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            disabled={isRecording}
            style={{ 
              paddingTop: '0.375rem',
              paddingBottom: '0.375rem',
              lineHeight: '1.5',
              minHeight: '1.5rem',
              maxHeight: '8rem'
            }}
          />
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-full transition shadow-lg flex-shrink-0 ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : hasText
              ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
              : 'bg-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/40'
          }`}
          title={isRecording ? 'Parar gravação' : hasText ? 'Enviar mensagem' : 'Gravar áudio'}
        >
          {isRecording ? (
            <StopCircle className="h-5 w-5 md:h-6 md:w-6" />
          ) : hasText ? (
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          ) : (
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
          )}
        </button>
      </div>
    </div>
  )
}

