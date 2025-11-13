# 🔧 Correção Rápida: Erro de Volume no Easypanel

## ❌ Erro

```
invalid mount target, must be an absolute path: ./app/uploads
```

## ✅ Solução Rápida

### No Easypanel - Configurar Volume Corretamente

1. **Acesse o serviço Backend** no Easypanel
2. Vá em **"Volumes"** ou **"Storage"**
3. **Edite o volume existente** ou **adicione um novo**:
   - **Name**: `uploads` (ou qualquer nome)
   - **Source**: `./uploads` (caminho relativo ao projeto)
   - **Mount Path**: `/app/uploads` ⚠️ **DEVE começar com /** (caminho absoluto)
   - **Read Only**: `false` (desmarcado)

### ❌ Configuração Incorreta

```
Source: ./uploads
Mount Path: ./app/uploads  ❌ (NÃO funciona - caminho relativo)
```

### ✅ Configuração Correta

```
Source: ./uploads
Mount Path: /app/uploads  ✅ (Funciona - caminho absoluto)
```

## 🔍 Verificação

Após corrigir:
1. Salve a configuração
2. O Easypanel irá recriar o container
3. Verifique os logs para confirmar que não há mais erros
4. Teste se os arquivos são salvos corretamente

## 📝 Passo a Passo no Easypanel

1. Abra o projeto no Easypanel
2. Clique no serviço **Backend**
3. Vá em **"Volumes"** ou **"Storage"**
4. Clique em **"Add Volume"** ou **"Edit"** no volume existente
5. Configure:
   - **Source Path**: `./uploads`
   - **Mount Path**: `/app/uploads` ⚠️ **DEVE começar com /**
6. Salve e aguarde o redeploy

## ✅ Resultado Esperado

Após a correção:
- O container deve iniciar sem erros
- O diretório `/app/uploads` deve existir no container
- Os arquivos devem ser salvos corretamente
- Os arquivos devem ser acessíveis via API
