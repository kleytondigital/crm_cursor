import { Controller, Get, Param, Res, NotFoundException, Headers, Req, Logger, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { Public } from '@/shared/decorators/public.decorator';
import { MinioService } from '@/shared/minio/minio.service';

@Controller('uploads')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly minioService: MinioService) {}

  @Get('*')
  @Public()
  async serveFile(
    @Param('0') filePath: string,
    @Res({ passthrough: false }) res: Response,
    @Req() req: Request,
    @Headers('range') range?: string,
  ) {
    // IMPORTANTE: Quando usamos @Res({ passthrough: false }), o NestJS não processa a resposta
    // Precisamos usar res diretamente e não retornar nada
    
    try {
      if (!filePath) {
        res.status(404).json({ error: 'Caminho do arquivo não especificado' });
        return;
      }
      
      // Limpar o caminho do arquivo e prevenir directory traversal
      let cleanPath = filePath.replace(/^\/+/, '').replace(/\.\./g, '');
      
      if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.replace(/^uploads\//, '');
      }
      
      // Converter caminho para key do MinIO
      // Se não começar com chats/, adicionar
      const key = cleanPath.startsWith('chats/') ? cleanPath : `chats/${cleanPath}`;
      
      // Verificar se o arquivo existe no MinIO
      const fileExists = await this.minioService.fileExists(key);
      if (!fileExists) {
        this.logger.warn(`Arquivo não encontrado no MinIO: ${key}`);
        res.status(404).json({ error: `Arquivo não encontrado: ${cleanPath}` });
        return;
      }

      // Obter metadados do arquivo
      const metadata = await this.minioService.getFileMetadata(key);
      const ext = filePath.split('.').pop()?.toLowerCase();
      
      // Determinar Content-Type
      let contentType = metadata.contentType || 'application/octet-stream';
      const isAudio = ext && ['ogg', 'mp3', 'wav', 'webm', 'm4a', 'aac', 'flac', 'opus'].includes(ext);
      const isVideo = ext && ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv', 'wmv'].includes(ext);
      
      if (isAudio && !contentType.startsWith('audio/')) {
        contentType =
          ext === 'ogg' ? 'audio/ogg' :
          ext === 'mp3' ? 'audio/mpeg' :
          ext === 'wav' ? 'audio/wav' :
          ext === 'webm' ? 'audio/webm' :
          ext === 'm4a' ? 'audio/mp4' :
          ext === 'aac' ? 'audio/aac' :
          ext === 'flac' ? 'audio/flac' :
          'audio/ogg';
      } else if (isVideo && !contentType.startsWith('video/')) {
        contentType =
          ext === 'mp4' ? 'video/mp4' :
          ext === 'webm' ? 'video/webm' :
          ext === 'avi' ? 'video/x-msvideo' :
          ext === 'mov' ? 'video/quicktime' :
          ext === 'mkv' ? 'video/x-matroska' :
          ext === 'flv' ? 'video/x-flv' :
          ext === 'wmv' ? 'video/x-ms-wmv' :
          'video/mp4';
      } else if (ext === 'jpg' || ext === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === 'png') {
        contentType = 'image/png';
      } else if (ext === 'gif') {
        contentType = 'image/gif';
      } else if (ext === 'webp') {
        contentType = 'image/webp';
      } else if (ext === 'pdf') {
        contentType = 'application/pdf';
      }
      
      const contentLength = metadata.contentLength || 0;
      this.logger.log(`Servindo do MinIO: ${key}, tipo: ${contentType}, tamanho: ${contentLength}, range: ${range || 'none'}`);
      
      // Headers básicos
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // Obter arquivo do MinIO
      const fileStream = await this.minioService.getFile(key);
      
      // Para áudio/vídeo: suportar range requests (necessário para streaming)
      if ((isAudio || isVideo) && range && contentLength > 0) {
        const rangeMatch = range.match(/bytes=(\d*)-(\d*)/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1] || '0', 10);
          const end = parseInt(rangeMatch[2] || String(contentLength - 1), 10);
          const actualEnd = Math.min(end, contentLength - 1);
          const actualStart = Math.max(0, Math.min(start, actualEnd));
          
          if (actualStart >= contentLength || actualStart > actualEnd) {
            res.setHeader('Content-Range', `bytes */${contentLength}`);
            res.status(416).end();
            return;
          }
          
          const chunkSize = (actualEnd - actualStart) + 1;
          
          res.status(206);
          res.setHeader('Content-Range', `bytes ${actualStart}-${actualEnd}/${contentLength}`);
          res.setHeader('Content-Length', chunkSize.toString());
          
          // Para range requests, precisamos ler apenas a parte solicitada
          // MinIO não suporta range nativo via SDK, então vamos redirecionar para URL assinada
          // ou ler o arquivo completo e fazer o range manualmente
          // Por simplicidade, vamos gerar uma URL assinada para o arquivo
          const signedUrl = await this.minioService.getSignedUrl(key, 3600);
          res.redirect(signedUrl);
          return;
        }
      }
      
      // Sem range ou não é áudio/vídeo: servir arquivo completo
      if (contentLength > 0) {
        res.setHeader('Content-Length', contentLength.toString());
      }
      
      fileStream.on('error', (err) => {
        this.logger.error(`Erro no stream do MinIO: ${key}`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao ler arquivo' });
        } else {
          res.destroy();
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      this.logger.error(`Erro ao processar arquivo: ${error.message}`, error.stack);
      if (!res.headersSent) {
        if (error instanceof NotFoundException || error.message.includes('não encontrado')) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
        }
      }
    }
  }
}

