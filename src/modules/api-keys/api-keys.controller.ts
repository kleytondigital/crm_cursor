import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  create(@Body() createApiKeyDto: CreateApiKeyDto, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.apiKeysService.create(createApiKeyDto, context);
  }

  @Get()
  findAll(@Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.apiKeysService.findAll(context);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.apiKeysService.findOne(id, context);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.apiKeysService.remove(id, context);
  }
}

