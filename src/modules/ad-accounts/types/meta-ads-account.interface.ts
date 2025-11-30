export interface MetaAdAccount {
  id: string; // act_123456789
  account_id: string; // 123456789 (sem o "act_")
  name: string;
  currency: string;
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
}

export interface MetaAdAccountDetails {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
  business?: {
    id: string;
    name: string;
  };
  timezone_name?: string;
  timezone_offset_hours_utc?: number;
  age?: {
    min?: number;
    max?: number;
  };
  funding_source?: {
    id: string;
    display_string: string;
  };
}

export interface MetaAdAccountsListResponse {
  data: MetaAdAccount[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}

