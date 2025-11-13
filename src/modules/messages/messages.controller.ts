import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, EditMessageDto, DeleteMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { randomUUID } from 'crypto';
import { MinioService } from '@/shared/minio/minio.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly minioService: MinioService,
  ) {}

  @Get('conversation/:conversationId')
  findByConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: any,
  ) {
    return this.messagesService.findByConversation(conversationId, user.companyId);
  }

  @Post()
  create(@Body() createMessageDto: CreateMessageDto, @CurrentUser() user: any) {
    return this.messagesService.create(
      createMessageDto,
      user.companyId,
      user.sub,
      user.role,
    );
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
      },
    }),
  )
  async uploadMedia(
    @UploadedFile() file: MulterFile,
  ): Promise<{ url: string; mimetype: string; filename: string }> {
    if (!file) {
      throw new BadRequestException('Arquivo não encontrado no upload.');
    }

    try {
      // Gerar nome único do arquivo
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;
      const extension =
        MessagesController.getExtension(file.originalname) ||
        MessagesController.inferExtension(file.mimetype);
      const fileName = `${randomUUID()}${extension}`;
      
      // Chave (caminho) do arquivo no MinIO
      const key = `chats/${yearMonth}/${fileName}`;
      
      // Upload para MinIO
      const publicUrl = await this.minioService.uploadFile(
        file.buffer,
        key,
        file.mimetype || 'application/octet-stream',
      );

      return {
        url: publicUrl,
        mimetype: file.mimetype,
        filename: file.originalname,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao fazer upload do arquivo: ${error.message}`,
      );
    }
  }

  private static getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private static inferExtension(mimetype: string): string {
    if (!mimetype) {
      return '';
    }
    if (mimetype.includes('jpeg')) return '.jpg';
    if (mimetype.includes('png')) return '.png';
    if (mimetype.includes('gif')) return '.gif';
    if (mimetype.includes('webp')) return '.webp';
    if (mimetype.includes('mp4')) return '.mp4';
    if (mimetype.includes('quicktime')) return '.mov';
    if (mimetype.includes('ogg')) return '.ogg';
    if (mimetype.includes('mpeg')) return '.mp3';
    if (mimetype.includes('aac')) return '.aac';
    if (mimetype.includes('pdf')) return '.pdf';
    if (mimetype.includes('msword')) return '.doc';
    if (mimetype.includes('spreadsheet')) return '.xls';
    if (mimetype.includes('presentation')) return '.ppt';
    if (mimetype.includes('text')) return '.txt';
    return '';
  }

  @Post('edit')
  async editMessage(@Body() editMessageDto: EditMessageDto, @CurrentUser() user: any) {
    return this.messagesService.editMessage(editMessageDto, user.companyId, user.sub);
  }

  @Post('delete')
  async deleteMessage(@Body() deleteMessageDto: DeleteMessageDto, @CurrentUser() user: any) {
    return this.messagesService.deleteMessage(deleteMessageDto, user.companyId, user.sub);
  }
}

