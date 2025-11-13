import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private readonly endpoint: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly useSSL: boolean;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT') || '';
    this.accessKey = this.configService.get<string>('MINIO_ACCESS_KEY') || '';
    this.secretKey = this.configService.get<string>('MINIO_SECRET_KEY') || '';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'crm';
    this.useSSL = this.configService.get<string>('MINIO_USE_SSL') !== 'false' && (this.endpoint.startsWith('https://') || !this.endpoint.includes('http://'));

    // Remover protocolo e barra final do endpoint
    // O endpoint pode ser a console ou a API, vamos remover /console se existir
    let endpointWithoutProtocol = this.endpoint
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/\/console$/, ''); // Remover /console se for o endpoint do console

    // Se o endpoint termina com /console, assumir que a API está na raiz
    // Caso contrário, usar o endpoint como está

    // Configurar cliente S3 para MinIO
    // MinIO geralmente usa a porta 9000 para API, mas pode estar configurado diferente
    // Vamos usar o endpoint fornecido e assumir que a API está disponível
    const apiEndpoint = `http${this.useSSL ? 's' : ''}://${endpointWithoutProtocol}`;
    
    this.s3Client = new S3Client({
      endpoint: apiEndpoint,
      region: 'us-east-1', // MinIO não precisa de região, mas o SDK requer
      credentials: {
        accessKeyId: this.accessKey,
        secretAccessKey: this.secretKey,
      },
      forcePathStyle: true, // Necessário para MinIO (usa formato: endpoint/bucket/key)
    });

    this.logger.log(`MinIO configurado: ${apiEndpoint}, bucket: ${this.bucketName}`);
  }

  async onModuleInit() {
    try {
      // Verificar se o bucket existe e criar se não existir
      await this.ensureBucketExists();
      this.logger.log(`MinIO inicializado com sucesso. Bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error(`Erro ao inicializar MinIO: ${error.message}`, error.stack);
      // Não falhar a aplicação se o MinIO não estiver disponível
      // A aplicação pode continuar funcionando, mas os uploads falharão
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      // Tentar verificar se o bucket existe usando HeadBucketCommand
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucketName,
        }),
      );
      this.logger.log(`Bucket ${this.bucketName} existe.`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket não existe, tentar criar
        try {
          await this.s3Client.send(
            new CreateBucketCommand({
              Bucket: this.bucketName,
            }),
          );
          this.logger.log(`Bucket ${this.bucketName} criado com sucesso.`);
        } catch (createError: any) {
          this.logger.warn(`Não foi possível criar o bucket ${this.bucketName}: ${createError.message}. O bucket será criado automaticamente no primeiro upload.`);
        }
      } else {
        this.logger.error(`Erro ao verificar bucket: ${error.message}`);
      }
    }
  }

  /**
   * Upload de arquivo para o MinIO
   * @param file Buffer ou Stream do arquivo
   * @param key Chave (caminho) do arquivo no bucket
   * @param contentType Tipo MIME do arquivo
   * @returns URL pública do arquivo
   */
  async uploadFile(
    file: Buffer | Readable,
    key: string,
    contentType: string,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      // Construir URL pública do arquivo
      const publicUrl = this.buildFileUrl(key);
      this.logger.log(`Arquivo enviado com sucesso: ${key} -> ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Erro ao fazer upload do arquivo ${key}: ${error.message}`, error.stack);
      throw new Error(`Erro ao fazer upload do arquivo: ${error.message}`);
    }
  }

  /**
   * Download de arquivo do MinIO
   * @param key Chave (caminho) do arquivo no bucket
   * @returns Stream do arquivo
   */
  async getFile(key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error(`Arquivo não encontrado: ${key}`);
      }

      // No AWS SDK v3, response.Body é geralmente um Readable stream em Node.js
      // Vamos tratar diferentes tipos de resposta
      if (response.Body instanceof Readable) {
        return response.Body;
      }
      
      // Se for um Blob ou Uint8Array, converter para stream
      if (response.Body instanceof Uint8Array || Buffer.isBuffer(response.Body)) {
        return Readable.from(Buffer.from(response.Body));
      }
      
      // Se for um objeto com método transformToWebStream ou stream()
      // Tentar usar como stream diretamente
      if (response.Body && typeof (response.Body as any).transformToWebStream === 'function') {
        // Converter Web Stream para Node.js Readable
        const webStream = (response.Body as any).transformToWebStream();
        const reader = webStream.getReader();
        const stream = new Readable({
          async read() {
            try {
              const { done, value } = await reader.read();
              if (done) {
                this.push(null);
              } else {
                this.push(Buffer.from(value));
              }
            } catch (error) {
              this.destroy(error as Error);
            }
          },
        });
        return stream;
      }
      
      // Fallback: tentar usar como stream diretamente
      // O AWS SDK v3 geralmente retorna um Readable em Node.js
      return response.Body as Readable;
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`Arquivo não encontrado: ${key}`);
      }
      this.logger.error(`Erro ao buscar arquivo ${key}: ${error.message}`, error.stack);
      throw new Error(`Erro ao buscar arquivo: ${error.message}`);
    }
  }

  /**
   * Verificar se um arquivo existe
   * @param key Chave (caminho) do arquivo no bucket
   * @returns true se o arquivo existe, false caso contrário
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Obter metadados de um arquivo
   * @param key Chave (caminho) do arquivo no bucket
   * @returns Metadados do arquivo (ContentType, ContentLength, etc.)
   */
  async getFileMetadata(key: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new Error(`Arquivo não encontrado: ${key}`);
      }
      this.logger.error(`Erro ao buscar metadados do arquivo ${key}: ${error.message}`, error.stack);
      throw new Error(`Erro ao buscar metadados do arquivo: ${error.message}`);
    }
  }

  /**
   * Gerar URL assinada (presigned URL) para download temporário
   * @param key Chave (caminho) do arquivo no bucket
   * @param expiresIn Tempo de expiração em segundos (padrão: 1 hora)
   * @returns URL assinada
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Erro ao gerar URL assinada para ${key}: ${error.message}`, error.stack);
      throw new Error(`Erro ao gerar URL assinada: ${error.message}`);
    }
  }

  /**
   * Construir URL pública do arquivo
   * @param key Chave (caminho) do arquivo no bucket
   * @returns URL pública do arquivo
   */
  private buildFileUrl(key: string): string {
    // Remover barra inicial se houver
    const cleanKey = key.startsWith('/') ? key.substring(1) : key;
    
    // Construir URL pública
    // Para MinIO com forcePathStyle, a URL é: https://endpoint/bucket/key
    let endpointWithoutProtocol = this.endpoint
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/\/console$/, ''); // Remover /console se existir
    
    // Construir URL pública usando o endpoint de API
    return `${this.useSSL ? 'https' : 'http'}://${endpointWithoutProtocol}/${this.bucketName}/${cleanKey}`;
  }

  /**
   * Obter URL pública do arquivo (para uso externo)
   * @param key Chave (caminho) do arquivo no bucket
   * @returns URL pública do arquivo
   */
  getPublicUrl(key: string): string {
    return this.buildFileUrl(key);
  }

  /**
   * Extrair a chave (key) de uma URL do MinIO
   * @param url URL pública do arquivo
   * @returns Chave do arquivo no bucket
   */
  extractKeyFromUrl(url: string): string {
    try {
      // Se a URL já contém o bucket, extrair a key diretamente
      if (url.includes(`/${this.bucketName}/`)) {
        // Remover protocolo e endpoint, deixando apenas bucket/key
        const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
        let endpointWithoutProtocol = this.endpoint
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '')
          .replace(/\/console$/, ''); // Remover /console se existir
        
        // Remover endpoint da URL
        const urlWithoutEndpoint = urlWithoutProtocol.replace(endpointWithoutProtocol, '');
        
        // Remover bucket da URL
        const key = urlWithoutEndpoint.replace(`/${this.bucketName}/`, '').replace(/^\/+/, '');
        
        return key;
      }
      
      // Se for um caminho relativo (ex: /uploads/chats/...), converter para key do MinIO
      // Remover /uploads se existir e manter o resto
      let key = url.replace(/^\/+/, '').replace(/^uploads\//, '');
      
      // Se não começar com chats/, adicionar
      if (!key.startsWith('chats/')) {
        key = `chats/${key}`;
      }
      
      return key;
    } catch (error) {
      this.logger.error(`Erro ao extrair key da URL ${url}: ${error.message}`);
      // Se não conseguir extrair, retornar a URL como está (pode ser um caminho relativo)
      return url.replace(/^\/+/, '').replace(/^uploads\//, '');
    }
  }
}

