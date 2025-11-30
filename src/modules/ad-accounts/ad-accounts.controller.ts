import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { AdAccountsService } from './ad-accounts.service';
import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('ad-accounts')
@UseGuards(JwtAuthGuard)
export class AdAccountsController {
  constructor(private readonly adAccountsService: AdAccountsService) {}

  /**
   * Lista contas de anúncio disponíveis para conexão
   */
  @Get('available')
  async listAvailable(
    @Query('connectionId') connectionId: string,
    @CurrentUser() user: any,
  ) {
    if (!connectionId) {
      throw new BadRequestException('connectionId é obrigatório');
    }
    return this.adAccountsService.listAvailable(user.companyId, connectionId);
  }

  /**
   * Conecta uma conta de anúncio ao tenant
   */
  @Post('connect')
  async connect(
    @Body() dto: CreateAdAccountDto,
    @CurrentUser() user: any,
  ) {
    return this.adAccountsService.connect(
      user.companyId,
      dto.connectionId,
      dto.adAccountId,
    );
  }

  /**
   * Lista contas de anúncio conectadas
   */
  @Get()
  async listConnected(@CurrentUser() user: any) {
    return this.adAccountsService.listConnected(user.companyId);
  }

  /**
   * Remove vínculo de uma conta de anúncio
   */
  @Delete(':id')
  async disconnect(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.adAccountsService.disconnect(user.companyId, id);
  }

  /**
   * Atualiza status de uma conta de anúncio
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.adAccountsService.updateAccountStatus(user.companyId, id);
  }
}

