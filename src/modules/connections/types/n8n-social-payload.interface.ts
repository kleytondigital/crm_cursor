export interface N8nSocialConnectionConfig {
  tenantId: string;
  connectionId: string;
  provider: 'INSTAGRAM' | 'FACEBOOK';
  pageId?: string;
  instagramBusinessId?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  webhookUrl: string;
  metadata?: Record<string, any>;
  // Informações dos apps Meta (opcional - para referência no n8n)
  oauthAppId?: string; // App usado para OAuth/login
  graphAppId?: string; // App usado para Graph API (se diferente)
}

export interface N8nSocialMessagePayload {
  provider: 'INSTAGRAM' | 'FACEBOOK';
  recipientId: string; // ID do Instagram/Facebook
  messageType: 'text' | 'image' | 'video' | 'audio' | 'file';
  content?: string;
  mediaUrl?: string;
  tempId?: string;
  replyTo?: string; // ID da mensagem original para reply
}

