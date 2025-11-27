import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Injectable()
export class SystemSettingsService {
  private readonly SETTINGS_ID = 1;

  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.ensureSettingsExists();
  }

  async updateSettings(dto: UpdateSystemSettingsDto) {
    await this.ensureSettingsExists();

    return this.prisma.systemSettings.update({
      where: { id: this.SETTINGS_ID },
      data: {
        ...dto,
      },
    });
  }

  private async ensureSettingsExists() {
    const existing = await this.prisma.systemSettings.findUnique({
      where: { id: this.SETTINGS_ID },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.systemSettings.create({
      data: {
        id: this.SETTINGS_ID,
        crmName: 'Darkmode CRM',
        slogan: 'Soluções em atendimento',
        version: '1.0.0',
      },
    });
  }
}

