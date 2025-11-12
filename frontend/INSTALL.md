# Instalação e Configuração - Frontend B2X CRM

## Pré-requisitos

- Node.js 18+ instalado
- Backend NestJS rodando na porta 3000

## Instalação

1. Navegue até a pasta frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

4. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3001`

## Login

Use as credenciais do backend para fazer login:
- Email: `admin@exemplo.com`
- Senha: `123456`

(ou as credenciais que você criou no seed do banco de dados)

## Estrutura

- `/login` - Página de login
- `/` - Interface de chat principal

## Funcionalidades Implementadas

✅ Lista de conversas com busca
✅ Área de mensagens com scroll automático
✅ Envio de mensagens de texto
✅ Envio de imagens
✅ Envio de arquivos (documentos, áudio, vídeo)
✅ Mensagens em tempo real via WebSocket
✅ Interface responsiva estilo WhatsApp Web
✅ Formatação de datas (hoje, ontem, data completa)

## Problemas Comuns

### Erro de conexão WebSocket
- Verifique se o backend está rodando
- Verifique se a URL do WebSocket está correta no `.env.local`
- Verifique se o token JWT é válido

### Mensagens não aparecem
- Verifique se o WebSocket está conectado (console do navegador)
- Verifique se há conversas criadas no banco de dados
- Verifique os logs do backend

### Erro ao fazer login
- Verifique se o backend está rodando
- Verifique se as credenciais estão corretas
- Verifique os logs do backend

