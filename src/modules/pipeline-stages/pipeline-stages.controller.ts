import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { PipelineStagesService } from './pipeline-stages.service';
import { CreatePipelineStageDto } from './dto/create-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('pipeline-stages')
@UseGuards(JwtAuthGuard)
export class PipelineStagesController {
  private readonly logger = new Logger(PipelineStagesController.name);

  constructor(private readonly pipelineStagesService: PipelineStagesService) {}

  @Post()
  async create(@Body() createStageDto: CreatePipelineStageDto, @CurrentUser() user: any) {
    try {
      this.logger.log(`[create] Requisição recebida: ${JSON.stringify(createStageDto)}`);
      const result = await this.pipelineStagesService.create(
        createStageDto,
        user.companyId,
        user.role,
      );
      this.logger.log(`[create] Estágio criado com sucesso`);
      return result;
    } catch (error: any) {
      this.logger.error(`[create] Erro no controller:`, {
        message: error.message,
        code: error.code,
        stack: error.stack,
        createStageDto,
        companyId: user.companyId,
      });
      throw error; // Re-throw para o filtro de exceção tratar
    }
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.pipelineStagesService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pipelineStagesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStageDto: UpdatePipelineStageDto,
    @CurrentUser() user: any,
  ) {
    return this.pipelineStagesService.update(
      id,
      updateStageDto,
      user.companyId,
      user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.pipelineStagesService.remove(id, user.companyId, user.role);
  }

  @Post('reorder')
  reorder(
    @Body() body: { stages: Array<{ id: string; order: number }> },
    @CurrentUser() user: any,
  ) {
    return this.pipelineStagesService.reorder(
      body.stages,
      user.companyId,
      user.role,
    );
  }
}

