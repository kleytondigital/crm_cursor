# B2X CRM - Frontend (Next.js)

Interface de chat estilo WhatsApp Web para o sistema B2X CRM.

## Tecnologias

- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Socket.io Client** - WebSocket para mensagens em tempo real
- **Axios** - Cliente HTTP
- **date-fns** - Formatação de datas
- **lucide-react** - Ícones

## Funcionalidades

- ✅ Lista de conversas com busca
- ✅ Área de mensagens com scroll automático
- ✅ Envio de mensagens de texto
- ✅ Envio de imagens
- ✅ Envio de arquivos (documentos, áudio, vídeo)
- ✅ Mensagens em tempo real via WebSocket
- ✅ Interface responsiva estilo WhatsApp Web
- ✅ Indicadores de status (online, offline)
- ✅ Formatação de datas (hoje, ontem, data completa)

## Instalação

```bash
cd frontend
npm install
```

## Configuração

Crie um arquivo `.env.local` na pasta `frontend`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

## Executar

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3001`

## Estrutura

```
frontend/
├── app/                  # Páginas Next.js
│   ├── layout.tsx       # Layout principal
│   ├── page.tsx         # Página inicial (chat)
│   ├── login/           # Página de login
│   └── globals.css      # Estilos globais
├── components/          # Componentes React
│   ├── ChatLayout.tsx   # Layout do chat
│   ├── ConversationsSidebar.tsx  # Sidebar com conversas
│   ├── ChatArea.tsx     # Área principal do chat
│   ├── ChatHeader.tsx   # Cabeçalho do chat
│   ├── MessageList.tsx  # Lista de mensagens
│   ├── MessageBubble.tsx # Bubbles de mensagem
│   ├── MessageInput.tsx # Input de mensagem
│   └── EmptyState.tsx   # Estado vazio
├── contexts/            # Context API
│   └── ChatContext.tsx  # Context do chat
├── lib/                 # Utilitários
│   ├── api.ts          # Cliente API
│   └── socket.ts       # Cliente WebSocket
└── types/              # Tipos TypeScript
    └── index.ts        # Definições de tipos
```

## Autenticação

O sistema utiliza JWT para autenticação. O token é armazenado no `localStorage` e enviado automaticamente nas requisições.

## WebSocket

A conexão WebSocket é estabelecida automaticamente quando o usuário faz login. As mensagens são recebidas em tempo real e atualizadas na interface.

## Próximos Passos

- [ ] Upload de arquivos para servidor
- [ ] Preview de imagens antes de enviar
- [ ] Indicadores de digitação (typing indicators)
- [ ] Notificações de novas mensagens
- [ ] Busca de mensagens
- [ ] Envio de áudio (gravação)
- [ ] Emojis e reações
- [ ] Mensagens com formatação (negrito, itálico)

