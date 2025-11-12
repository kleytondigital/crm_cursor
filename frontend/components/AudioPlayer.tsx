'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  profilePictureURL?: string | null
  duration?: number
  className?: string
}

// Função para gerar waveform simulado (baseado na duração)
const generateWaveform = (duration: number = 60, bars: number = 50): number[] => {
  const waveform: number[] = []
  for (let i = 0; i < bars; i++) {
    // Gera valores aleatórios entre 0.2 e 1.0 para criar uma visualização realista
    waveform.push(0.2 + Math.random() * 0.8)
  }
  return waveform
}

// Função para formatar tempo (segundos para MM:SS)
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export default function AudioPlayer({ 
  src, 
  profilePictureURL, 
  duration = 0,
  className = '' 
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [waveform, setWaveform] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => {
      setAudioDuration(audio.duration)
      if (waveform.length === 0) {
        setWaveform(generateWaveform(audio.duration))
      }
      setIsLoading(false)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('canplay', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('canplay', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [waveform.length])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((error) => {
        console.error('Erro ao reproduzir áudio:', error)
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * audioDuration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progressPercentage = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0
  const currentBarIndex = Math.floor((currentTime / audioDuration) * waveform.length)

  return (
    <div className={`flex items-center gap-2.5 w-full ${className}`}>
      {/* Áudio oculto */}
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Botão Play/Pause - Estilo WhatsApp Web */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-700/90 hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center transition-all shadow-sm active:scale-95"
        aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-gray-700 dark:text-gray-200 fill-current" />
        ) : (
          <Play className="w-4 h-4 text-gray-700 dark:text-gray-200 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform e Controles */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Waveform - Estilo WhatsApp Web */}
        <div
          className="flex items-center gap-[1.5px] h-5 cursor-pointer relative py-0.5"
          onClick={handleSeek}
          onMouseMove={(e) => {
            if (e.buttons === 1) {
              handleSeek(e)
            }
          }}
        >
          {/* Barras do waveform */}
          {waveform.length > 0 ? (
            waveform.map((height, index) => {
              const isPlayed = index <= currentBarIndex
              // Altura variável: mínimo 3px, máximo 16px (proporcional ao height)
              const barHeight = Math.max(3, Math.min(16, 3 + height * 13))
              
              return (
                <div
                  key={index}
                  className="flex-1 rounded-full transition-all duration-75"
                  style={{
                    height: `${barHeight}px`,
                    minHeight: '3px',
                    maxHeight: '16px',
                    backgroundColor: isPlayed 
                      ? '#25D366' // Verde WhatsApp
                      : '#8696A0', // Cinza WhatsApp
                  }}
                />
              )
            })
          ) : (
            // Loading state - barras cinzas
            Array.from({ length: 50 }).map((_, index) => (
              <div
                key={index}
                className="flex-1 bg-gray-400/50 rounded-full"
                style={{
                  height: `${3 + Math.random() * 13}px`,
                  minHeight: '3px',
                }}
              />
            ))
          )}
          
          {/* Indicador de progresso (ponto verde) - sobreposto */}
          {waveform.length > 0 && (
            <div
              className="absolute top-1/2 left-0 w-2 h-2 bg-green-500 rounded-full z-10 shadow-sm transition-all duration-100 pointer-events-none"
              style={{
                left: `${Math.max(0, Math.min(100, progressPercentage))}%`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>

        {/* Timestamps - Estilo WhatsApp Web */}
        <div className="flex items-center justify-between text-[10.5px] text-gray-600 dark:text-gray-400 leading-tight">
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="tabular-nums">{formatTime(audioDuration || 0)}</span>
        </div>
      </div>

      {/* Foto de Perfil - Estilo WhatsApp Web */}
      {profilePictureURL && (
        <div className="flex-shrink-0 relative w-9 h-9">
          <img
            src={profilePictureURL}
            alt="Foto de perfil"
            className="w-9 h-9 rounded-full object-cover"
            onError={(e) => {
              // Se a imagem falhar ao carregar, usar placeholder
              const target = e.target as HTMLImageElement
              target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Ccircle fill='%239ca3af' cx='18' cy='18' r='18'/%3E%3C/svg%3E`
            }}
          />
          {/* Ícone de microfone sobreposto - Estilo WhatsApp Web */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-[1.5px] border-white dark:border-gray-900 shadow-sm">
            <Volume2 className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

