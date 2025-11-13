export interface MessageEditHistory {
  id: string
  messageId: string
  oldText?: string | null
  newText?: string | null
  editedBy?: string | null
  editedAt: string
  tenantId: string
}

export interface Message {
  id: string
  conversationId: string
  senderType: 'LEAD' | 'USER'
  contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LOCATION'
  contentUrl?: string
  contentText?: string
  latitude?: number | null
  longitude?: number | null
  tenantId: string
  createdAt: string
  direction?: 'INCOMING' | 'OUTGOING'
  timestamp?: string
  messageId?: string | null
  reply?: boolean
  replyText?: string | null
  replyMessageId?: string | null
  // Campos para histórico de edições/exclusões
  editedAt?: string | null
  deletedAt?: string | null
  editedBy?: string | null
  deletedBy?: string | null
  originalText?: string | null
  editHistory?: MessageEditHistory[]
  conversation?: Conversation
  sender?: {
    id: string
    email: string
    name?: string
    role?: string
  }
}

export interface Conversation {
  id: string
  leadId: string
  assignedUserId?: string
  departmentId?: string
  status: 'ACTIVE' | 'CLOSED'
  tenantId: string
  createdAt: string
  updatedAt: string
  lead: {
    id: string
    name: string
    phone: string
    tags: string[]
    profilePictureURL?: string | null
  }
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  lastMessage?: Message
  unreadCount?: number
}

export interface Lead {
  id: string
  name: string
  phone: string
  tags: string[]
  status: 'NOVO' | 'EM_ATENDIMENTO' | 'AGUARDANDO' | 'CONCLUIDO'
  profilePictureURL?: string | null
  tenantId: string
  createdAt: string
  updatedAt: string
  conversations?: Conversation[]
}

export type AttendanceStatus = 'OPEN' | 'IN_PROGRESS' | 'TRANSFERRED' | 'CLOSED'
export type AttendancePriority = 'LOW' | 'NORMAL' | 'HIGH'

export interface Attendance {
  id: string
  tenantId: string
  lead: {
    id: string
    name: string
    phone: string
    profilePictureURL?: string | null
  }
  connectionId?: string | null
  assignedUserId?: string | null // ID do usuário atribuído
  assignedUser?: {
    id: string
    name: string
    email: string
  } | null
  departmentId?: string | null // ID do departamento
  department?: {
    id: string
    name: string
  } | null
  status: AttendanceStatus
  priority: AttendancePriority
  isUrgent: boolean
  lastMessage?: string | null
  lastMessageAt?: string | null
  startedAt?: string | null
  endedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceLog {
  id: string
  action: 'CREATED' | 'CLAIMED' | 'TRANSFERRED' | 'CLOSED'
  notes?: string | null
  createdAt: string
  performedBy: {
    id: string
    name: string
    email: string
  } | null
}

export interface AttendanceDetails extends Attendance {
  logs: AttendanceLog[]
  messages: Message[]
}

export interface AttendanceStats {
  total_abertos: number
  total_em_andamento: number
  total_encerrados: number
  tempo_medio_atendimento: number
}

export interface DepartmentUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
  joinedAt: string
}

export interface Department {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  users: DepartmentUser[]
}

export interface UserSummary {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPER_ADMIN'
}

export type ScheduledContentType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'DOCUMENT'
export type ScheduledMessageStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'

export interface ScheduledMessage {
  id: string
  tenantId: string
  leadId: string | null
  connectionId: string
  userId: string
  departmentId?: string | null
  contentType: ScheduledContentType
  content?: string | null
  caption?: string | null
  scheduledFor: string
  sentAt?: string | null
  status: ScheduledMessageStatus
  campaignId?: string | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
  lead?: {
    id: string
    name: string
    phone: string
  }
  connection?: {
    id: string
    name: string
    sessionName: string
  }
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface Campaign {
  id: string
  tenantId: string
  name: string
  description?: string | null
  filterTags: string[]
  filterStages: string[]
  totalLeads: number
  scheduledFor: string
  createdById: string
  status: CampaignStatus
  contentType: ScheduledContentType
  content?: string | null
  caption?: string | null
  connectionId?: string | null
  useRandomConnection: boolean
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
    email: string
  }
  connection?: {
    id: string
    name: string
    sessionName: string
  }
  scheduledMessages?: ScheduledMessage[]
  _count?: {
    scheduledMessages: number
  }
}

export interface Connection {
  id: string
  name: string
  sessionName: string
  status: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'ERROR'
  tenantId: string
  createdAt: string
  updatedAt: string
}

