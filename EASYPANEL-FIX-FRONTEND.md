# 🔧 Correção: Erro de Dockerfile no Frontend - Easypanel

## ❌ Erro

```
ERROR: failed to build: resolve : lstat /etc/easypanel/projects/dietazap/front_crm/code/frontend/frontend/Dockerfile: no such file or directory
```

## 🔍 Causa

No Easypanel, quando você define o **Context** como `./frontend`, o **Dockerfile Path** deve ser relativo ao Context, não à raiz do projeto.

O erro ocorre porque o Easypanel está procurando o Dockerfile em:
- `frontend/frontend/Dockerfile` ❌ (incorreto - path duplicado)

Quando deveria procurar em:
- `frontend/Dockerfile` ✅ (correto)

## ✅ Solução

### Configuração Correta no Easypanel

1. **Acesse o serviço Frontend** no Easypanel
2. Vá em **"Build"** ou **"Dockerfile"**
3. Configure:
   - **Context**: `./frontend` (caminho relativo à raiz do projeto)
   - **Dockerfile Path**: `Dockerfile` ⚠️ **Apenas o nome do arquivo, relativo ao Context**

### ❌ Configuração Incorreta

```
Context: ./frontend
Dockerfile Path: frontend/Dockerfile  ❌ (NÃO funciona - duplica o path)
```

### ✅ Configuração Correta

```
Context: ./frontend
Dockerfile Path: Dockerfile  ✅ (Funciona - relativo ao context)
```

## 📝 Explicação

No Easypanel:
- O **Context** define o diretório de trabalho para o build
- O **Dockerfile Path** é relativo ao Context, não à raiz do projeto

### Exemplo 1: Context na pasta frontend (Recomendado)

```
Context: ./frontend
Dockerfile Path: Dockerfile
```

Resultado: O Docker procura `./frontend/Dockerfile`

### Exemplo 2: Context na raiz (Alternativa)

```
Context: .
Dockerfile Path: frontend/Dockerfile
```

Resultado: O Docker procura `./frontend/Dockerfile`

## 🔧 Configuração Completa no Easypanel

### Frontend - Build

1. **Context**: `./frontend`
2. **Dockerfile Path**: `Dockerfile` (apenas o nome do arquivo)
3. **Build Args**:
   ```env
   NEXT_PUBLIC_API_URL=https://seu-dominio.com/api
   NEXT_PUBLIC_WS_URL=https://seu-dominio.com
   ```

### Verificação

Após corrigir:
1. Salve a configuração
2. O Easypanel irá fazer o build novamente
3. Verifique os logs para confirmar que o Dockerfile foi encontrado
4. O build deve funcionar corretamente

## 🔍 Troubleshooting

### Erro: "no such file or directory"

**Solução**: Verifique se o Dockerfile Path está correto
- Se Context é `./frontend`, Dockerfile Path deve ser `Dockerfile`
- Se Context é `.`, Dockerfile Path deve ser `frontend/Dockerfile`

### Erro: "context not found"

**Solução**: Verifique se o Context existe
- O Context `./frontend` deve existir no repositório Git
- Verifique se a pasta `frontend` existe na raiz do projeto

### Verificação Local

Para verificar se a configuração está correta:

```bash
# Se Context é ./frontend, Dockerfile Path deve ser Dockerfile
cd frontend
ls -la Dockerfile  # Deve existir

# Ou se Context é ., Dockerfile Path deve ser frontend/Dockerfile
cd .
ls -la frontend/Dockerfile  # Deve existir
```

## 📚 Referências

- [Docker Build Context Documentation](https://docs.docker.com/build/building/context/)
- [Easypanel Docker Documentation](https://easypanel.io/docs/docker)
- [EASYPANEL.md](./EASYPANEL.md) - Documentação completa do Easypanel

