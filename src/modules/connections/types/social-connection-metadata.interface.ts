export interface SocialConnectionMetadata {
  // Meta OAuth data
  pageId?: string;
  instagramBusinessId?: string;
  accessToken?: string;
  tokenExpiresAt?: string; // ISO date string
  permissions?: string[];
  
  // Page/Account info
  pageName?: string;
  instagramUsername?: string;
  pageCategory?: string;
  
  // Additional metadata
  [key: string]: any;
}

