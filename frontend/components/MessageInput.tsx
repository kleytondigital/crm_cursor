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
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
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

    const handleClickOutside = (event: MouseEvent) => {
      if (
        attachmentsRef.current &&
        !attachmentsRef.current.contains(event.target as Node)
      ) {
        setShowAttachments(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const selectedFormat = AUDIO_MIME_OPTIONS.find((option) =>
        MediaRecorder.isTypeSupported(option.mime),
      )

      const formatToUse = selectedFormat ?? AUDIO_FALLBACK

      if (!MediaRecorder.isTypeSupported(formatToUse.mime)) {
        setRecordingError(
          'Não foi possível iniciar a gravação. Verifique as permissões de áudio do navegador.',
        )
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: formatToUse.mime,
        audioBitsPerSecond: 128000 // 128kbps para qualidade adequada
      })
      recordedChunksRef.current = []
      recordingFormatRef.current = formatToUse

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('Chunk de áudio capturado:', event.data.size, 'bytes')
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        console.log('Gravação finalizada. Total de chunks:', recordedChunksRef.current.length)
        
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current)
        }

        if (recordedChunksRef.current.length === 0) {
          console.error('Nenhum chunk de áudio foi capturado')
          setRecordingError('Falha ao capturar áudio. Tente novamente.')
          mediaRecorder.stream.getTracks().forEach((track) => track.stop())
          setIsRecording(false)
          setRecordingTime(0)
          return
        }

        const format = recordingFormatRef.current ?? AUDIO_FALLBACK
        const blob = new Blob(recordedChunksRef.current, { type: format.mime })
        
        console.log('Blob de áudio criado:', blob.size, 'bytes, tipo:', blob.type)
        
        if (blob.size === 0) {
          console.error('Blob de áudio vazio')
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
        
        console.log('Arquivo de áudio criado:', file.name, file.size, 'bytes')
        setAudioPreview({ url, file })

        mediaRecorder.stream.getTracks().forEach((track) => track.stop())
        recordingFormatRef.current = null
        setIsRecording(false)
        setRecordingTime(0)
      }

      mediaRecorderRef.current = mediaRecorder
      // Solicitar dados a cada 100ms para garantir captura contínua
      mediaRecorder.start(100)
      console.log('Gravação iniciada com formato:', formatToUse.mime)
      
      setRecordingError(null)
      setIsRecording(true)
      setRecordingTime(0)
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Erro ao gravar áudio:', error)
      setRecordingError(
        'Não foi possível iniciar a gravação. Verifique as permissões de áudio do navegador.',
      )
      setIsRecording(false)
      recordingFormatRef.current = null
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

  return (
    <div className="flex flex-col gap-3">
      {audioPreview && (
        <div className="flex items-center gap-4 rounded-2xl border border-brand-primary/30 bg-[#d9fdd3] px-4 py-3 text-sm text-black shadow-inner">
          <audio controls src={audioPreview.url} className="max-w-xs" />
          <div className="flex gap-2">
            <button
              onClick={handleSubmitRecordedAudio}
              className="flex items-center gap-1 rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-primary/90"
            >
              <Check className="h-4 w-4" />
              Enviar
            </button>
            <button
              onClick={handleDiscardRecording}
              className="flex items-center gap-1 rounded-full border border-black/20 px-3 py-1 text-xs font-semibold text-black/80 transition hover:border-black/40 hover:text-black"
            >
              <Trash2 className="h-4 w-4" />
              Descartar
            </button>
          </div>
        </div>
      )}

      {recordingError && (
        <p className="text-xs text-brand-danger/80">{recordingError}</p>
      )}

      <div className="flex items-end gap-3">
        {/* Timer de gravação visual */}
        {isRecording && (
          <div className="flex items-center gap-3 rounded-full border border-red-500/50 bg-red-500/10 px-4 py-2 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-semibold text-red-400">
                {formattedTime}
              </span>
            </div>
            <span className="text-xs text-text-muted">Gravando...</span>
          </div>
        )}

        <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-background-muted/70 px-4 py-2 shadow-inner-glow">
          {onScheduleClick && !isRecording && (
            <button
              type="button"
              onClick={onScheduleClick}
              className="flex h-10 w-10 items-center justify-center rounded-full text-brand-secondary transition hover:bg-brand-secondary/20 hover:text-brand-secondary"
              title="Agendar Mensagem"
            >
              <Calendar className="h-5 w-5" />
            </button>
          )}
          <div className="relative" ref={attachmentsRef}>
            <button
              type="button"
              onClick={() => setShowAttachments((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition hover:bg-white/10 hover:text-white"
              title="Anexar"
            >
              <Plus className="h-5 w-5" />
            </button>

            {showAttachments && (
              <div className="absolute bottom-14 left-0 z-40 w-56 rounded-2xl border border-white/10 bg-background-card/95 p-2 shadow-glow backdrop-blur-xl">
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition hover:bg-white/10 hover:text-white"
              title="Emojis"
            >
              <Smile className="h-5 w-5" />
            </button>
          )}

          {/* Indicador de resposta/edição */}
          {(replyTo || editMessage) && !isRecording && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-background-muted/60 px-3 py-2 text-xs">
              {editMessage ? (
                <>
                  <Edit2 className="h-3 w-3 text-yellow-400" />
                  <span className="flex-1 text-text-muted">
                    Editando: {editMessage.contentText?.substring(0, 50)}
                    {editMessage.contentText && editMessage.contentText.length > 50 ? '...' : ''}
                  </span>
                </>
              ) : replyTo ? (
                <>
                  <Reply className="h-3 w-3 text-blue-400" />
                  <span className="flex-1 text-text-muted">
                    Respondendo: {replyTo.contentText?.substring(0, 50)}
                    {replyTo.contentText && replyTo.contentText.length > 50 ? '...' : ''}
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
                className="rounded-full p-1 hover:bg-white/10 transition-colors"
                title="Cancelar"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={editMessage ? "Digite o novo texto da mensagem..." : replyTo ? "Digite sua resposta..." : "Digite uma mensagem..."}
            rows={1}
            className="flex-1 max-h-32 resize-none border-0 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            disabled={isRecording}
          />
        </div>

        <button
          type="button"
          onClick={handlePrimaryAction}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition shadow-lg ${
            isRecording
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : hasText
              ? 'bg-brand-primary text-white hover:bg-brand-primary/90'
              : 'bg-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/40'
          }`}
          title={isRecording ? 'Parar gravação' : hasText ? 'Enviar mensagem' : 'Gravar áudio'}
        >
          {isRecording ? (
            <StopCircle className="h-6 w-6" />
          ) : hasText ? (
            <Send className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  )
}

