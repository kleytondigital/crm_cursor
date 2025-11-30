export interface SocialConnectionMetadata {
  // Meta OAuth data
  pageId?: string;
  instagramBusinessId?: string;
  accessToken?: string; // Page access token (para mensagens)
  tokenExpiresAt?: string; // ISO date string
  permissions?: string[];
  
  // User access token (para Meta Ads API)
  userAccessToken?: string;
  userAccessTokenExpiresAt?: string; // ISO date string
  userRefreshToken?: string;
  
  // Serviços habilitados
  enabledServices?: Array<
    'WHATSAPP_API' | 'INSTAGRAM_DIRECT' | 'FACEBOOK_MESSENGER' | 'META_ADS'
  >;
  
  // Page/Account info
  pageName?: string;
  instagramUsername?: string;
  pageCategory?: string;
  
  // Additional metadata
  [key: string]: any;
}

