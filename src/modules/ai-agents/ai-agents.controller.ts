import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AIAgentsService } from './ai-agents.service';
import { CreateAIAgentDto } from './dto/create-ai-agent.dto';
import { UpdateAIAgentDto } from './dto/update-ai-agent.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('ai-agents')
@UseGuards(JwtAuthGuard)
export class AIAgentsController {
  constructor(private readonly aiAgentsService: AIAgentsService) {}

  @Post()
  create(@Body() createDto: CreateAIAgentDto, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.aiAgentsService.create(createDto, context);
  }

  @Get()
  findAll(@Request() req: any, @Query('departmentId') departmentId?: string) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.aiAgentsService.findAll(context, departmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.aiAgentsService.findOne(id, context);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAIAgentDto,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.aiAgentsService.update(id, updateDto, context);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.aiAgentsService.remove(id, context);
  }
}

