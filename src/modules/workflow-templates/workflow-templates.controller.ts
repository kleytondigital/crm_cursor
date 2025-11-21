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
import { WorkflowTemplatesService } from './workflow-templates.service';
import { CreateWorkflowTemplateDto } from './dto/create-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-template.dto';
import { CreateWorkflowInstanceDto } from './dto/create-instance.dto';
import { UpdateWorkflowInstanceDto } from './dto/update-instance.dto';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';

@Controller('workflow-templates')
@UseGuards(JwtAuthGuard)
export class WorkflowTemplatesController {
  constructor(
    private readonly workflowTemplatesService: WorkflowTemplatesService,
  ) {}

  // ============= TEMPLATES =============

  @Post()
  createTemplate(@Body() dto: CreateWorkflowTemplateDto, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.createTemplate(dto, context);
  }

  @Get()
  findAllTemplates(@Request() req: any, @Query('category') category?: string) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.findAllTemplates(context, category);
  }

  @Get(':id')
  findOneTemplate(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.findOneTemplate(id, context);
  }

  @Patch(':id')
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.updateTemplate(id, dto, context);
  }

  @Delete(':id')
  removeTemplate(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.removeTemplate(id, context);
  }

  // ============= INSTANCES =============

  @Post(':templateId/instantiate')
  instantiateTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: CreateWorkflowInstanceDto,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.instantiateTemplate(
      templateId,
      dto,
      context,
    );
  }

  @Get('instances/all')
  findAllInstances(@Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.findAllInstances(context);
  }

  @Get('instances/:id')
  findOneInstance(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.findOneInstance(id, context);
  }

  @Patch('instances/:id')
  updateInstance(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowInstanceDto,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.updateInstance(id, dto, context);
  }

  @Post('instances/:id/activate')
  activateInstance(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.activateInstance(id, context);
  }

  @Post('instances/:id/deactivate')
  deactivateInstance(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.deactivateInstance(id, context);
  }

  @Delete('instances/:id')
  removeInstance(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.removeInstance(id, context);
  }

  // ============= PROMPT MANAGEMENT =============

  @Post('instances/:id/prompt')
  createOrAdjustPrompt(
    @Param('id') id: string,
    @Body() dto: CreatePromptDto,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.createOrAdjustPrompt(id, dto, context);
  }

  @Get('instances/:id/prompt')
  getPrompt(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.getPrompt(id, context);
  }

  @Patch('instances/:id/prompt')
  updatePrompt(
    @Param('id') id: string,
    @Body() dto: { prompt: string },
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.updatePrompt(id, dto.prompt, context);
  }

  @Delete('instances/:id/prompt')
  clearPrompt(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.clearPrompt(id, context);
  }

  // ============= CONNECTION MANAGEMENT =============

  @Get('instances/:id/connections')
  getConnectionsForInstance(@Param('id') id: string, @Request() req: any) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.getConnectionsForInstance(id, context);
  }

  @Post('instances/:id/connections/:connectionId')
  connectInstanceToConnection(
    @Param('id') id: string,
    @Param('connectionId') connectionId: string,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.connectInstanceToConnection(
      id,
      connectionId,
      context,
    );
  }

  @Post('instances/:id/connections/:connectionId/wizard')
  connectInstanceToConnectionWithWizard(
    @Param('id') id: string,
    @Param('connectionId') connectionId: string,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.connectInstanceToConnectionWithWizard(
      id,
      connectionId,
      context,
    );
  }

  @Delete('instances/:id/connections/:connectionId')
  disconnectInstanceFromConnection(
    @Param('id') id: string,
    @Param('connectionId') connectionId: string,
    @Request() req: any,
  ) {
    const context = {
      userId: req.user.id,
      tenantId: req.user.companyId,
      role: req.user.role,
    };
    return this.workflowTemplatesService.disconnectInstanceFromConnection(
      id,
      connectionId,
      context,
    );
  }
}

