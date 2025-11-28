export interface MetaOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Segundos até expiração
}

export interface MetaPageInfo {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  tasks?: string[];
}

export interface MetaInstagramBusinessAccount {
  id: string;
  username?: string;
  profile_picture_url?: string;
}

