import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PipelineStagesService } from './pipeline-stages.service';
import { CreatePipelineStageDto } from './dto/create-stage.dto';
import { UpdatePipelineStageDto } from './dto/update-stage.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';

@Controller('pipeline-stages')
@UseGuards(JwtAuthGuard)
export class PipelineStagesController {
  constructor(private readonly pipelineStagesService: PipelineStagesService) {}

  @Post()
  create(@Body() createStageDto: CreatePipelineStageDto, @CurrentUser() user: any) {
    return this.pipelineStagesService.create(
      createStageDto,
      user.companyId,
      user.role,
    );
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

