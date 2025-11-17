import { Module, Global } from '@nestjs/common';
import { N8nApiService } from './n8n-api.service';

@Global()
@Module({
  providers: [N8nApiService],
  exports: [N8nApiService],
})
export class N8nApiModule {}

