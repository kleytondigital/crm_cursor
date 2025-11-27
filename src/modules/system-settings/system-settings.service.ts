import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Injectable()
export class SystemSettingsService {
  private readonly SETTINGS_ID = 1;

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    try {
      return await this.ensureSettingsExists();
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        throw new BadRequestException(
          'Tabela de configurações do sistema não encontrada. Execute a migration primeiro.',
        );
      }
      throw new InternalServerErrorException('Erro ao buscar configurações do sistema');
    }
  }

  async updateSettings(dto: UpdateSystemSettingsDto) {
    try {
      await this.ensureSettingsExists();

      // Filtrar apenas campos definidos
      const updateData: any = {};
      if (dto.crmName !== undefined && dto.crmName !== null) {
        updateData.crmName = dto.crmName.trim();
      }
      if (dto.slogan !== undefined && dto.slogan !== null) {
        updateData.slogan = dto.slogan.trim();
      }
      if (dto.version !== undefined && dto.version !== null) {
        updateData.version = dto.version.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return this.getSettings();
      }

      return await this.prisma.systemSettings.update({
        where: { id: this.SETTINGS_ID },
        data: updateData,
      });
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        throw new BadRequestException(
          'Tabela de configurações do sistema não encontrada. Execute a migration primeiro.',
        );
      }
      if (error?.code === 'P2025') {
        throw new BadRequestException('Configurações do sistema não encontradas.');
      }
      throw new BadRequestException(
        error?.message || 'Erro ao atualizar configurações do sistema',
      );
    }
  }

  private async ensureSettingsExists() {
    try {
      const existing = await this.prisma.systemSettings.findUnique({
        where: { id: this.SETTINGS_ID },
      });

      if (existing) {
        return existing;
      }

      return await this.prisma.systemSettings.create({
        data: {
          id: this.SETTINGS_ID,
          crmName: 'Darkmode CRM',
          slogan: 'Soluções em atendimento',
          version: '1.0.0',
        },
      });
    } catch (error: any) {
      // Se a tabela não existir, criar via SQL direto
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        throw error; // Será tratado no método chamador
      }
      throw error;
    }
  }
}

