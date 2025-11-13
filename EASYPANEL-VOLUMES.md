# 📁 Configuração de Volumes no Easypanel - B2X CRM

## ⚠️ Erro Comum: "invalid mount target, must be an absolute path"

### Problema

Ao configurar volumes no Easypanel, você pode receber o erro:
```
invalid mount target, must be an absolute path: ./app/uploads
```

### Causa

O caminho do **target** (destino no container) deve ser um **caminho absoluto**, não relativo.

### Solução

#### ✅ Correto
- **Source**: `./uploads` ou `/caminho/absoluto/uploads` (caminho no host)
- **Target**: `/app/uploads` (caminho absoluto no container - **DEVE começar com /**)

#### ❌ Incorreto
- **Target**: `./app/uploads` (caminho relativo - **NÃO funciona**)
- **Target**: `app/uploads` (caminho relativo - **NÃO funciona**)

## 🔧 Configuração no Easypanel

### 1. Acessar Configuração de Volumes

1. No serviço **Backend**, vá em **"Volumes"** ou **"Storage"**
2. Clique em **"Add Volume"** ou **"Mount Volume"**

### 2. Configurar Volume

**Configuração**:
- **Type**: `Bind Mount` ou `Volume`
- **Source** (Host): `./uploads` ou caminho absoluto no host
- **Target** (Container): `/app/uploads` (**OBRIGATORIAMENTE caminho absoluto**)
- **Mount Path**: `/app/uploads` (mesmo que Target)

### 3. Exemplo de Configuração

```
Source: ./uploads
Target: /app/uploads
Mount Path: /app/uploads
```

**Importante**:
- O **Target** deve começar com `/` (caminho absoluto)
- O **Source** pode ser relativo (`./uploads`) ou absoluto (`/var/www/uploads`)
- No Easypanel, geralmente você pode usar `./uploads` como Source e `/app/uploads` como Target

## 📝 Configuração Completa no Easypanel

### Backend - Volumes

1. **Nome do Volume**: `uploads` (ou qualquer nome)
2. **Source Path**: `./uploads` (caminho relativo ao projeto)
3. **Mount Path**: `/app/uploads` (**caminho absoluto no container**)
4. **Read Only**: `false` (permitir escrita)

### Verificação

Após configurar o volume, verifique:
1. O container está rodando
2. O diretório `/app/uploads` existe no container
3. Os arquivos são salvos corretamente
4. Os arquivos são acessíveis via API

## 🔍 Troubleshooting

### Erro: "invalid mount target"

**Solução**: Verifique se o Target começa com `/`
- ❌ `./app/uploads` → ❌ Não funciona
- ❌ `app/uploads` → ❌ Não funciona
- ✅ `/app/uploads` → ✅ Funciona

### Arquivos não são salvos

**Solução**: Verifique as permissões
1. O diretório `/app/uploads` deve ter permissões de escrita
2. O usuário do container (nestjs) deve ter permissões
3. Verifique os logs do container para erros de permissão

### Arquivos não são acessíveis

**Solução**: Verifique a configuração do FilesController
1. O caminho está correto no código
2. O volume está montado corretamente
3. O Nginx está configurado para servir arquivos estáticos

## 📚 Recursos

- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [Easypanel Volumes Documentation](https://easypanel.io/docs/storage)

