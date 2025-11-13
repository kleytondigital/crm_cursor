# 🔧 Configuração do MinIO no Easypanel

## ⚠️ Erro: "S3 API Requests must be made to API port"

Este erro ocorre quando o endpoint fornecido é o endpoint da **console** (interface web) do MinIO, ao invés do endpoint da **API S3**.

### Problema

No Easypanel, o MinIO geralmente tem dois endpoints:
- **Console** (interface web): `console-dietazap-minio.h3ag2x.easypanel.host`
- **API S3**: `dietazap-minio.h3ag2x.easypanel.host` (sem o prefixo "console-")

### Solução

#### Opção 1: Configurar MINIO_API_ENDPOINT (Recomendado)

No Easypanel, configure a variável de ambiente `MINIO_API_ENDPOINT` com o endpoint da API S3:

```env
MINIO_API_ENDPOINT="https://dietazap-minio.h3ag2x.easypanel.host"
```

**Como obter o endpoint da API no Easypanel:**
1. Acesse o serviço MinIO no Easypanel
2. Vá em **"Domain"** ou **"Networking"**
3. Procure pelo endpoint da **API** (não o da console)
4. Geralmente é o mesmo hostname sem o prefixo "console-"

#### Opção 2: Usar MINIO_ENDPOINT (Automático)

Se você fornecer apenas `MINIO_ENDPOINT` com o endpoint da console, o sistema tentará inferir o endpoint da API removendo o prefixo "console-" do hostname:

```env
MINIO_ENDPOINT="https://console-dietazap-minio.h3ag2x.easypanel.host"
```

O sistema automaticamente converterá para:
- `https://dietazap-minio.h3ag2x.easypanel.host`

### Configuração Completa no Easypanel

No serviço **backend**, configure as seguintes variáveis de ambiente:

```env
# MinIO (armazenamento de arquivos)
MINIO_API_ENDPOINT="https://dietazap-minio.h3ag2x.easypanel.host"
# OU
MINIO_ENDPOINT="https://console-dietazap-minio.h3ag2x.easypanel.host"
MINIO_ACCESS_KEY="XdtbAgKqH4E5lPBZCGRg"
MINIO_SECRET_KEY="YaFrWBqS2mTaaohj59ZpGZh4tIibTIyLxxJeIaMT"
MINIO_BUCKET="crm"
MINIO_USE_SSL="true"
```

### Verificação

Após configurar, verifique os logs do backend. Você deve ver:

```
[MinioService] MinIO API configurado: https://dietazap-minio.h3ag2x.easypanel.host, bucket: crm
```

Se ainda aparecer o erro "S3 API Requests must be made to API port", verifique:

1. **Endpoint da API está correto?**
   - Teste o endpoint manualmente: `curl https://dietazap-minio.h3ag2x.easypanel.host`
   - Deve retornar uma resposta do MinIO (não a interface web)

2. **Credenciais estão corretas?**
   - Verifique se `MINIO_ACCESS_KEY` e `MINIO_SECRET_KEY` estão corretas

3. **Bucket existe?**
   - O bucket será criado automaticamente no primeiro upload
   - Ou crie manualmente via console do MinIO

### Notas

- O endpoint da **console** é apenas para interface web (gerenciamento)
- O endpoint da **API** é para requisições S3 (upload/download de arquivos)
- No Easypanel, ambos os endpoints geralmente usam HTTPS
- O proxy reverso do Easypanel roteia automaticamente para a porta correta

