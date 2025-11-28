'use client'

import { useState, useEffect } from 'react'
import { Conversation, Attendance, Lead } from '@/types'
import { attendancesAPI } from '@/lib/api'
import { leadsAPI } from '@/lib/api'
import { pipelineStagesAPI, PipelineStage } from '@/lib/api/pipeline-stages'

export interface ConversationTags {
  stage: PipelineStage | null
  attendance: Attendance | null
  lead: Lead | null
  loading: boolean
}

export function useConversationTags(conversation: Conversation | null) {
  const [tags, setTags] = useState<ConversationTags>({
    stage: null,
    attendance: null,
    lead: null,
    loading: true,
  })

  const loadTags = async (leadId: string) => {
    try {
      setTags((prev) => ({ ...prev, loading: true }))
      
      const [attendanceResult, leadResult] = await Promise.allSettled([
        attendancesAPI.getByLeadId(leadId),
        leadsAPI.getById(leadId),
      ])

      let attendance: Attendance | null = null
      let lead: Lead | null = null
      let stage: PipelineStage | null = null

      // Processar attendance
      if (attendanceResult.status === 'fulfilled') {
        const attendanceData = attendanceResult.value
        const attendanceArray = Array.isArray(attendanceData?.data)
          ? attendanceData.data
          : attendanceData?.data
            ? [attendanceData.data]
            : Array.isArray(attendanceData)
            ? attendanceData
            : []
        
        // Pegar o primeiro attendance ativo (não fechado)
        attendance = attendanceArray.find((a: any) => a.status !== 'CLOSED') || attendanceArray[0] || null
      }

      // Processar lead
      if (leadResult.status === 'fulfilled') {
        const leadData = leadResult.value
        lead = leadData?.data || leadData || null

        // Buscar estágio baseado no statusId do lead
        if (lead?.statusId) {
          try {
            const leadStatusId = lead.statusId // Capturar para garantir que não é null
            const stages = await pipelineStagesAPI.getAll()
            stage = stages.find((s) => s.statusId === leadStatusId && s.isActive) || null
          } catch (err) {
            console.error('Erro ao carregar estágios:', err)
          }
        }
      }

      setTags({ stage, attendance, lead, loading: false })
    } catch (err) {
      console.error('Erro ao carregar tags da conversa:', err)
      setTags({ stage: null, attendance: null, lead: null, loading: false })
    }
  }

  useEffect(() => {
    if (!conversation?.leadId) {
      setTags({ stage: null, attendance: null, lead: null, loading: false })
      return
    }

    loadTags(conversation.leadId)

    // Escutar eventos de atualização
    const handleUpdate = () => {
      if (conversation?.leadId) {
        loadTags(conversation.leadId)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('lead:updated', handleUpdate)
      window.addEventListener('attendance:updated', handleUpdate)
      
      return () => {
        window.removeEventListener('lead:updated', handleUpdate)
        window.removeEventListener('attendance:updated', handleUpdate)
      }
    }
  }, [conversation?.leadId, conversation?.id])

  return tags
}

