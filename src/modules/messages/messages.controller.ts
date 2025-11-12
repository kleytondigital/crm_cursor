import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '@/shared/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

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
      storage: diskStorage({
        destination: (req, file, cb) => {
          const now = new Date();
          const yearMonth = `${now.getFullYear()}-${String(
            now.getMonth() + 1,
          ).padStart(2, '0')}`;
          const uploadPath = join(
            process.cwd(),
            'uploads',
            'chats',
            yearMonth,
          );
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          (req as any).uploadYearMonth = yearMonth;
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const extension =
            extname(file.originalname) ||
            MessagesController.inferExtension(file.mimetype);
          const unique = `${randomUUID()}${extension}`;
          (req as any).storedFileName = unique;
          cb(null, unique);
        },
      }),
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

    const relativePath = file.path
      .replace(process.cwd(), '')
      .replace(/\\/g, '/');
    const url = relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`;

    return {
      url,
      mimetype: file.mimetype,
      filename: file.originalname,
    };
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
}

