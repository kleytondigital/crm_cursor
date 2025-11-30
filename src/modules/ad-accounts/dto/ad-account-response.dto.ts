export class AdAccountResponseDto {
  id: string;
  tenantId: string;
  adAccountId: string;
  name: string;
  currency?: string | null;
  accountStatus?: string | null;
  businessId?: string | null;
  connectionId: string;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

