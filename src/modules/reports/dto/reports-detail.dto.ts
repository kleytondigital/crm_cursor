export interface LeadsDetailDto {
  id: string;
  name: string;
  phone: string;
  status: string;
  origin: string | null;
  createdAt: string;
  updatedAt: string;
  convertedAt: string | null;
  totalMessages: number;
  totalAttendances: number;
}

export interface AttendancesDetailDto {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  assignedUserId: string;
  assignedUserName: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  totalMessages: number;
}

export interface MessagesDetailDto {
  id: string;
  conversationId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  content: string;
  direction: string;
  contentType: string;
  createdAt: string;
  senderName: string | null;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

