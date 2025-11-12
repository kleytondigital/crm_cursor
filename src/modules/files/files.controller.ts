import { Controller, Get, Param, Res, NotFoundException, Headers, Req, Logger, BadRequestException } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';
import { existsSync, statSync, createReadStream } from 'fs';
import { Public } from '@/shared/decorators/public.decorator';

@Controller('uploads')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  @Get('*')
  @Public()
  serveFile(
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
      
      const fullPath = join(process.cwd(), 'uploads', cleanPath);

      if (!existsSync(fullPath)) {
        this.logger.warn(`Arquivo não encontrado: ${cleanPath}`);
        res.status(404).json({ error: `Arquivo não encontrado: ${cleanPath}` });
        return;
      }

      const stats = statSync(fullPath);
      const ext = filePath.split('.').pop()?.toLowerCase();
      
      // Determinar Content-Type
      let contentType = 'application/octet-stream';
      const isAudio = ext && ['ogg', 'mp3', 'wav', 'webm', 'm4a', 'aac', 'flac', 'opus'].includes(ext);
      const isVideo = ext && ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv', 'wmv'].includes(ext);
      
      if (isAudio) {
        contentType =
          ext === 'ogg' ? 'audio/ogg' :
          ext === 'mp3' ? 'audio/mpeg' :
          ext === 'wav' ? 'audio/wav' :
          ext === 'webm' ? 'audio/webm' :
          ext === 'm4a' ? 'audio/mp4' :
          ext === 'aac' ? 'audio/aac' :
          ext === 'flac' ? 'audio/flac' :
          'audio/ogg';
      } else if (isVideo) {
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
      
      this.logger.log(`Servindo: ${cleanPath}, tipo: ${contentType}, tamanho: ${stats.size}, range: ${range || 'none'}`);
      
      // Headers básicos
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      
      // Para áudio/vídeo: suportar range requests (necessário para streaming)
      if (isAudio || isVideo) {
        if (range) {
          const rangeMatch = range.match(/bytes=(\d*)-(\d*)/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1] || '0', 10);
            const end = parseInt(rangeMatch[2] || String(stats.size - 1), 10);
            const actualEnd = Math.min(end, stats.size - 1);
            const actualStart = Math.max(0, Math.min(start, actualEnd));
            
            if (actualStart >= stats.size || actualStart > actualEnd) {
              res.setHeader('Content-Range', `bytes */${stats.size}`);
              res.status(416).end();
              return;
            }
            
            const chunkSize = (actualEnd - actualStart) + 1;
            
            res.status(206);
            res.setHeader('Content-Range', `bytes ${actualStart}-${actualEnd}/${stats.size}`);
            res.setHeader('Content-Length', chunkSize.toString());
            
            const fileStream = createReadStream(fullPath, { start: actualStart, end: actualEnd });
            
            fileStream.on('error', (err) => {
              this.logger.error(`Erro no stream: ${cleanPath}`, err);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Erro ao ler arquivo' });
              } else {
                res.destroy();
              }
            });
            
            fileStream.pipe(res);
            return;
          }
        }
        
        // Sem range: servir arquivo completo
        res.setHeader('Content-Length', stats.size.toString());
        const fileStream = createReadStream(fullPath);
        
        fileStream.on('error', (err) => {
          this.logger.error(`Erro no stream: ${cleanPath}`, err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Erro ao ler arquivo' });
          } else {
            res.destroy();
          }
        });
        
        fileStream.pipe(res);
        return;
      }
      
      // Para outros arquivos: usar sendFile
      res.sendFile(fullPath, (err) => {
        if (err) {
          this.logger.error(`Erro ao enviar arquivo ${cleanPath}: ${err.message}`);
          if (!res.headersSent) {
            if (err.code === 'ENOENT') {
              res.status(404).json({ error: 'Arquivo não encontrado' });
            } else if (err.status) {
              res.status(err.status).end();
            } else {
              res.status(500).json({ error: 'Erro ao servir arquivo', message: err.message });
            }
          }
        }
      });
    } catch (error) {
      this.logger.error(`Erro ao processar arquivo: ${error.message}`, error.stack);
      if (!res.headersSent) {
        if (error instanceof NotFoundException) {
          res.status(404).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
        }
      }
    }
  }
}

