import { io, Socket } from 'socket.io-client'
import { Attendance } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'

let attendanceSocket: Socket | null = null

export const connectAttendanceSocket = (token: string): Socket => {
  if (attendanceSocket?.connected) {
    return attendanceSocket
  }

  if (attendanceSocket) {
    attendanceSocket.disconnect()
  }

  const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`

  attendanceSocket = io(`${WS_URL}/attendances`, {
    auth: {
      token: bearerToken,
    },
    extraHeaders: {
      Authorization: bearerToken,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  attendanceSocket.on('connect', () => {
    console.log('[attendance] socket conectado')
  })

  attendanceSocket.on('disconnect', () => {
    console.log('[attendance] socket desconectado')
  })

  attendanceSocket.on('connect_error', (error) => {
    console.error('[attendance] erro de conexão', error)
  })

  return attendanceSocket
}

export const disconnectAttendanceSocket = () => {
  if (attendanceSocket) {
    attendanceSocket.disconnect()
    attendanceSocket = null
  }
}

export const onAttendanceNew = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.on('attendance:new', callback)
}

export const offAttendanceNew = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.off('attendance:new', callback)
}

export const onAttendanceUpdate = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.on('attendance:update', callback)
}

export const offAttendanceUpdate = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.off('attendance:update', callback)
}

export const onAttendanceTransferred = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.on('attendance:transferred', callback)
}

export const offAttendanceTransferred = (callback: (attendance: Attendance) => void) => {
  attendanceSocket?.off('attendance:transferred', callback)
}

export const getAttendanceSocket = () => attendanceSocket




