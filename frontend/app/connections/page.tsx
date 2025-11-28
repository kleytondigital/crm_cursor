'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Plus,
  Play,
  RefreshCw,
  QrCode,
  Trash2,
  Power,
  Settings,
  ShieldAlert,
  Bot,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer';
import BottomNavigation from '@/components/BottomNavigation';
import ManageConnectionAutomationsModal from '@/components/admin/ManageConnectionAutomationsModal';
import CreateConnectionDialog from '@/components/connections/CreateConnectionDialog';
import { connectionsAPI } from '@/lib/api';

const DEFAULT_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_WAHA_WEBHOOK ||
  process.env.NEXT_PUBLIC_WAHA_WEBHOOK_URL ||
  '';
const DEFAULT_WEBHOOK_EVENTS = ['session.status', 'message'];

type SessionWebhook = {
  url: string;
  events: string[];
  hmac?: { key?: string | null } | null;
  retries?: {
    delaySeconds?: number | null;
    attempts?: number | null;
    policy?: string | null;
  } | null;
  customHeaders?: Record<string, string> | null;
};

type SessionInfo = {
  status?: string | null;
  waId?: string | null;
  pushName?: string | null;
  picture?: string | null;
  webhooks?: SessionWebhook[] | null;
  raw?: unknown;
};

type Connection = {
  id: string;
  name: string;
  sessionName: string;
  status: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'ERROR';
  webhookUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  statusInfo?: SessionInfo | null;
};

type QrResponse = {
  sessionName: string;
  status?: string | null;
  qr: string | null;
  mimetype?: string | null;
};

const statusConfig: Record<
  string,
  { label: string; tone: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' }
> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  ACTIVE: { label: 'Ativa', tone: 'default' },
  STOPPED: { label: 'Suspensa', tone: 'secondary' },
  ERROR: { label: 'Falha', tone: 'destructive' },
  WORKING: { label: 'Conectada', tone: 'default' },
  CONNECTED: { label: 'Conectada', tone: 'default' },
  DISCONNECTED: { label: 'Desconectada', tone: 'destructive' },
  FAILED: { label: 'Desconectada', tone: 'destructive' },
  CONNECTING: { label: 'Conectando', tone: 'warning' },
  PAUSED: { label: 'Pausada', tone: 'secondary' },
  SUSPENDED: { label: 'Suspensa', tone: 'secondary' },
  STARTING: { label: 'Iniciando', tone: 'warning' },
};

const WEBHOOK_EVENT_OPTIONS = [
  'session.status',
  'message',
  'message.any',
  'message.reaction',
  'message.ack',
  'message.waiting',
  'message.revoked',
  'message.edited',
  'chat.archive',
  'group.v2.join',
  'group.v2.leave',
  'group.v2.update',
  'group.v2.participants',
  'group.join',
  'group.leave',
  'presence.update',
  'poll.vote',
  'poll.vote.failed',
  'call.received',
  'call.accepted',
  'call.rejected',
  'label.upsert',
  'label.deleted',
  'label.chat.added',
  'label.chat.deleted',
  'event.response',
  'event.response.failed',
  'engine.event',
];

const normalizeSessionWebhook = (item: any) => ({
  url: typeof item?.url === 'string' ? item.url : '',
  events: Array.isArray(item?.events)
    ? (item.events as unknown[]).filter(
        (value): value is string => typeof value === 'string',
      )
    : [],
  hmac: item?.hmac ?? null,
  retries: item?.retries ?? null,
  customHeaders:
    item?.customHeaders === undefined ? null : item.customHeaders ?? null,
});

const parseWebhooksPayload = (payload: any): SessionWebhook[] => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => parseWebhooksPayload(item));
  }

  if (typeof payload === 'object' && Array.isArray(payload.webhooks)) {
    return payload.webhooks as SessionWebhook[];
  }

  return [];
};

const extractSessionWebhooks = (connection: Connection): SessionWebhook[] => {
  if (!connection?.statusInfo) {
    return [];
  }
  const direct = connection.statusInfo.webhooks;
  if (Array.isArray(direct)) {
    return direct;
  }
  // fallback for legacy raw payload
  const raw: any = (connection.statusInfo as any)?.raw;
  if (raw && Array.isArray(raw.webhooks)) {
    return raw.webhooks as SessionWebhook[];
  }
  return [];
};

export default function ConnectionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [connectInfo, setConnectInfo] = useState<SessionInfo | null>(null);
  const [connectCode, setConnectCode] = useState<string | null>(null);
  const [connectDialog, setConnectDialog] = useState<{
    open: boolean;
    connection: Connection | null;
  }>({ open: false, connection: null });
  const [connectMode, setConnectMode] = useState<'qr' | 'code'>('qr');
  const [qrResponse, setQrResponse] = useState<QrResponse | null>(null);
  const [authPhone, setAuthPhone] = useState('');
  const [authPhoneError, setAuthPhoneError] = useState<string | null>(null);
  const [webhooksDialog, setWebhooksDialog] = useState<{
    open: boolean;
    connection: Connection | null;
  }>({ open: false, connection: null });
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooksError, setWebhooksError] = useState<string | null>(null);
  const [automationsDialog, setAutomationsDialog] = useState<{
    open: boolean;
    connection: Connection | null;
  }>({ open: false, connection: null });
  const [createConnectionOpen, setCreateConnectionOpen] = useState(false);
  const [webhookForms, setWebhookForms] = useState<
    Array<{
      url: string;
      events: string[];
      hmac?: { key?: string | null } | null;
      retries?: {
        delaySeconds?: number | null;
        attempts?: number | null;
        policy?: string | null;
      } | null;
      customHeaders?: Record<string, string> | null;
    }>
  >([]);

  useEffect(() => {
    setMounted(true);
    // Verificar autenticação e role
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const role = user.role || null;
          
          // Apenas ADMIN e MANAGER têm acesso
          if (role === 'ADMIN' || role === 'MANAGER') {
            setIsAuthorized(true);
          } else {
            // Redirecionar usuários não autorizados
            router.push('/');
          }
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        router.push('/login');
      }
    }
  }, [router]);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }, [mounted]);

  useEffect(() => {
    if (connectMode === 'qr') {
      setConnectCode(null);
    }
  }, [connectMode]);

  const authHeaders = () => {
    if (!token) {
      throw new Error('Token de autenticação não encontrado.');
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchConnections = async (): Promise<Connection[]> => {
    const response = await fetch('/api/connections', {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || 'Não foi possível carregar as conexões.');
    }

    return data;
  };

  const { data: whatsappConnections = [], isLoading: isLoadingWhatsApp, isError: isErrorWhatsApp, error: errorWhatsApp } = useQuery<Connection[], Error>({
    queryKey: ['connections'],
    queryFn: fetchConnections,
    enabled: mounted && !!token,
  });

  // Buscar conexões sociais
  const { data: socialConnections = [], isLoading: isLoadingSocial, isError: isErrorSocial, error: errorSocial } = useQuery({
    queryKey: ['social-connections'],
    queryFn: () => connectionsAPI.getSocialConnections(),
    enabled: mounted && !!token,
  });

  // Combinar todas as conexões
  const allConnections = useMemo(() => {
    const combined: any[] = []
    
    // Adicionar conexões WhatsApp
    if (whatsappConnections) {
      combined.push(...whatsappConnections.map(conn => ({ ...conn, type: 'WHATSAPP' })))
    }
    
    // Adicionar conexões sociais
    if (socialConnections) {
      combined.push(...socialConnections.map((conn: any) => ({ ...conn, type: conn.provider })))
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    return combined.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt).getTime()
      const dateB = new Date(b.createdAt || b.updatedAt).getTime()
      return dateB - dateA
    })
  }, [whatsappConnections, socialConnections])

  const isLoading = isLoadingWhatsApp || isLoadingSocial
  const isError = isErrorWhatsApp || isErrorSocial
  const error: Error | null = errorWhatsApp || (errorSocial as Error | null) || null
  const data = allConnections

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      payload,
    }: {
      id: string;
      action:
        | 'start'
        | 'stop'
        | 'restart'
        | 'delete'
        | 'reload'
        | 'connect'
        | 'disconnect'
        | 'auth-code';
      payload?: Record<string, any>;
    }) => {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ action, ...(payload || {}) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao executar ação.');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err: any) => {
      setStatusError(err?.message || 'Erro ao executar ação.');
    },
  });

  const qrMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/connections/${id}/qr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao obter QR Code.');
      }
      return data as QrResponse;
    },
    onMutate: () => {
      setQrResponse(null);
      setStatusError(null);
    },
    onSuccess: (data) => {
      setQrResponse(data);
    },
    onError: (err: any) => {
      setStatusError(err?.message || 'Erro ao buscar QR Code. Tente novamente.');
    },
  });

  const handleAction = (
    id: string,
    action:
      | 'start'
      | 'stop'
      | 'restart'
      | 'delete'
      | 'reload'
      | 'connect'
      | 'disconnect'
      | 'auth-code',
    payload?: Record<string, any>,
  ) => {
    setStatusError(null);
    actionMutation.mutate({ id, action, payload });
  };

  const openConnectDialog = (connection: Connection) => {
    console.log('[connectDialog] openConnectDialog -> connection', connection);
    setConnectMode('qr');
    setQrResponse(null);
    setAuthPhone('');
    setAuthPhoneError(null);
    setStatusError(null);
    setConnectCode(null);
    setConnectInfo(connection.statusInfo ?? null);
    setConnectDialog({ open: true, connection });
  };

  const closeConnectDialog = () => {
    console.log('[connectDialog] closeConnectDialog');
    setConnectDialog({ open: false, connection: null });
    setQrResponse(null);
    setAuthPhone('');
    setAuthPhoneError(null);
    setStatusError(null);
    setConnectInfo(null);
    setConnectCode(null);
  };

  const refreshConnection = async (connectionId: string) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        cache: 'no-store',
      });
      const list = await response.json();
      if (!response.ok) {
        throw new Error(list?.message || 'Erro ao atualizar sessão.');
      }
      const updated = (list as Connection[]).find(
        (item) => item.id === connectionId,
      );
      if (updated) {
        setConnectInfo(updated.statusInfo ?? null);
        setConnectDialog((prev) => ({
          open: prev.open,
          connection: updated,
        }));
        queryClient.setQueryData(['connections'], list);
        const runtimeStatus =
          updated.statusInfo?.status?.toUpperCase() || updated.status;
        if (runtimeStatus === 'WORKING' || runtimeStatus === 'CONNECTED') {
          closeConnectDialog();
          queryClient.invalidateQueries({ queryKey: ['connections'] });
        }
      }
    } catch (err) {
      console.log('[connectDialog] refreshConnection error', err);
    }
  };

  const openWebhooksDialog = async (connection: Connection) => {
    setWebhooksError(null);
    setWebhooksLoading(true);
    const initialWebhooks = extractSessionWebhooks(connection).map(
      normalizeSessionWebhook,
    );
    setWebhookForms(
      initialWebhooks.length > 0
        ? initialWebhooks
        : [{ url: '', events: [], hmac: null, retries: null, customHeaders: null }],
    );
    setWebhooksDialog({ open: true, connection });
    try {
      const response = await fetch(
        `/api/connections/${connection.id}/webhooks`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao obter webhooks');
      }
      const fetchedWebhooks = parseWebhooksPayload(data);
      const mapped = fetchedWebhooks.map((item: any) =>
        normalizeSessionWebhook(item),
      );

      if (mapped.length > 0) {
        setWebhookForms(mapped);
      } else if (initialWebhooks.length > 0) {
        setWebhookForms(initialWebhooks);
      } else {
        setWebhookForms([
          { url: '', events: [], hmac: null, retries: null, customHeaders: null },
        ]);
      }
    } catch (err: any) {
      setWebhooksError(err?.message || 'Erro ao carregar webhooks.');
    } finally {
      setWebhooksLoading(false);
    }
  };

  const closeWebhooksDialog = () => {
    setWebhooksDialog({ open: false, connection: null });
    setWebhookForms([]);
    setWebhooksError(null);
    setWebhooksLoading(false);
  };

  const handleAddWebhook = () => {
    if (webhookForms.length >= 3) {
      return;
    }
    setWebhookForms((prev) => [
      ...prev,
      { url: '', events: [], hmac: null, retries: null, customHeaders: null },
    ]);
  };

  const handleRemoveWebhook = (index: number) => {
    setWebhookForms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWebhookChange = (index: number, value: string) => {
    setWebhookForms((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              url: value,
            }
          : item,
      ),
    );
  };

  const toggleWebhookEvent = (index: number, eventName: string) => {
    setWebhookForms((prev) =>
      prev.map((item, i) => {
        if (i !== index) {
          return item;
        }
        const exists = item.events.includes(eventName);
        return {
          ...item,
          events: exists
            ? item.events.filter((event) => event !== eventName)
            : [...item.events, eventName],
        };
      }),
    );
  };

  const handleSaveWebhooks = async () => {
    if (!webhooksDialog.connection) {
      return;
    }
    setWebhooksLoading(true);
    setWebhooksError(null);
    try {
      const payload = {
        config: {
          webhooks: webhookForms.map((item) => ({
            url: item.url,
            events: item.events,
            hmac: null,
            retries: null,
            customHeaders: null,
          })),
        },
      };
      const response = await fetch(
        `/api/connections/${webhooksDialog.connection.id}/webhooks`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao salvar webhooks.');
      }
      await refreshConnection(webhooksDialog.connection.id);
      closeWebhooksDialog();
    } catch (err: any) {
      setWebhooksError(err?.message || 'Erro ao salvar webhooks.');
    } finally {
      setWebhooksLoading(false);
    }
  };

  useEffect(() => {
    if (!connectDialog.open || !connectDialog.connection) {
      return;
    }

    const interval = setInterval(() => {
      refreshConnection(connectDialog.connection!.id);
    }, 3000);

    return () => clearInterval(interval);
  }, [connectDialog.open, connectDialog.connection]);

  const handleGenerateQr = async () => {
    if (!connectDialog.connection) {
      return;
    }
    try {
      await qrMutation.mutateAsync(connectDialog.connection.id);
      await refreshConnection(connectDialog.connection.id);
    } catch (err) {
      // erro tratado no mutation
    }
  };

  const handleSendAuthCode = async () => {
    if (!connectDialog.connection) {
      return;
    }
    const trimmed = authPhone.trim();
    if (!trimmed) {
      setAuthPhoneError('Informe o número com código do país. Ex.: +5511999999999');
      return;
    }
    setAuthPhoneError(null);
    try {
      const result = await actionMutation.mutateAsync({
        id: connectDialog.connection.id,
        action: 'auth-code',
        payload: { phone: trimmed },
      });
      console.log('[connectDialog] auth-code result', result);
      const code =
        (typeof result === 'string' && result) ||
        result?.code ||
        result?.data?.code ||
        (Array.isArray(result) && result[0]?.code) ||
        (result?.data && Array.isArray(result.data) && result.data[0]?.code) ||
        null;
      if (code) {
        setConnectCode(code);
      } else {
        console.warn('[connectDialog] auth-code: código não encontrado no payload');
      }
      await refreshConnection(connectDialog.connection.id);
    } catch (err) {
      // erro tratado no mutation
    }
  };

  if (!mounted || !token) {
    return null;
  }

  console.log('[connectDialog] state', connectDialog);
  console.log('[connectDialog] connectMode', connectMode);
  console.log('[connectDialog] qrResponse', qrResponse);

  if (!mounted || !isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navigation />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-background-subtle/60 p-8 shadow-inner-glow text-center">
            <ShieldAlert className="h-12 w-12 text-rose-400" />
            <h2 className="text-xl font-semibold text-white">Acesso Negado</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Você não possui permissão para acessar esta página.
            </p>
          </div>
        </div>
        <Footer />
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 md:gap-6 lg:gap-8 px-3 md:px-6 pb-20 md:pb-10 pt-4 md:pt-6">
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-background-muted to-background-card px-6 py-8">
        <div className="absolute inset-0 bg-hero-grid opacity-70" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-text-muted">Conexões de Redes Sociais</p>
            <h1 className="mt-3 text-3xl font-bold text-white">
              Conexões Inteligentes
            </h1>
            <p className="mt-1 text-sm text-text-muted max-w-xl">
              Gerencie todas as suas conexões de redes sociais (WhatsApp, Instagram e Facebook Messenger). Monitore em tempo real, configure QR Codes dinâmicos, gerencie automações e tenha controle total sobre seus canais de comunicação.
            </p>
            {statusError && (
              <div className="mt-4 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                {statusError}
              </div>
            )}
          </div>

          <Button onClick={() => setCreateConnectionOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova conexão
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : isError ? (
          <div className="rounded-3xl border border-brand-danger/30 bg-brand-danger/10 px-6 py-5 text-brand-danger">
            <p>
              {error instanceof Error
                ? error.message
                : 'Erro ao carregar conexões.'}
            </p>
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-3 md:gap-4 lg:gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((connection) => {
              const runtimeStatusKey =
                connection.statusInfo?.status?.toUpperCase() || connection.status;
              const status =
                statusConfig[runtimeStatusKey] ?? statusConfig[connection.status];
              const isConnected =
                runtimeStatusKey === 'WORKING' || runtimeStatusKey === 'CONNECTED';
              const sessionWebhooks = extractSessionWebhooks(connection);
              const hasSessionWebhooks = sessionWebhooks.length > 0;

              return (
                <Card key={connection.id} className="flex h-full flex-col">
                  <CardHeader className="border-b border-white/5 p-3 md:p-4">
                    <CardTitle className="flex items-start justify-between gap-2 text-white">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm md:text-base font-semibold truncate">{connection.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <Badge variant={status.tone} className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1">{status.label}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 md:h-8 md:w-8 text-text-muted hover:text-white"
                          onClick={() => setAutomationsDialog({ open: true, connection })}
                          title="Gerenciar Automações"
                        >
                          <Bot className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 md:h-8 md:w-8 text-text-muted hover:text-white"
                          onClick={() => openWebhooksDialog(connection)}
                          title="Configurações avançadas"
                          disabled={webhooksLoading && webhooksDialog.connection?.id === connection.id}
                        >
                          <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </Button>
                      </div>
                    </CardTitle>
                    {/* <CardDescription className="text-xs text-text-muted">
                      ID: {connection.sessionName}
                    </CardDescription> */}
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-2 md:gap-2.5 text-xs md:text-sm text-text-muted p-3 md:p-4">
                    {connection.sessionName && (
                      <div className="rounded-lg border border-white/5 bg-background-soft/50 px-2.5 md:px-3 py-1.5 md:py-2">
                        <p className="text-[10px] md:text-[11px] uppercase tracking-wide text-text-muted">
                          {connection.type === 'WHATSAPP' ? 'Sessão' : 'ID'}
                        </p>
                        <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-text-primary break-words truncate">
                          {connection.sessionName}
                        </p>
                      </div>
                    )}
                    {connection.metadata && (connection.type === 'INSTAGRAM' || connection.type === 'FACEBOOK') && (
                      <div className="rounded-lg border border-white/5 bg-background-soft/50 px-2.5 md:px-3 py-1.5 md:py-2">
                        <p className="text-[10px] md:text-[11px] uppercase tracking-wide text-text-muted">
                          Conta
                        </p>
                        <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-text-primary break-words truncate">
                          {connection.metadata?.pageName || connection.metadata?.instagramUsername || connection.name}
                        </p>
                      </div>
                    )}

                    {isConnected && (
                      <div className="flex items-center gap-2 md:gap-2 rounded-lg border border-white/5 bg-white/5 px-2.5 md:px-3 py-2 md:py-2">
                        <div className="flex h-7 w-7 md:h-8 md:w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-secondary/20 text-brand-secondary text-[11px] md:text-xs">
                          {connection.statusInfo?.picture ? (
                            <img
                              src={connection.statusInfo.picture}
                              alt={connection.statusInfo.pushName || connection.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (connection.statusInfo?.pushName ?? connection.name).charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] md:text-xs font-semibold text-white">
                            {connection.statusInfo?.pushName || 'Dispositivo autenticado'}
                          </p>
                          <p className="truncate text-[10px] md:text-[11px] text-text-muted">
                            {connection.statusInfo?.waId || 'Número indisponível'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-white/5 bg-background-soft/50 px-2.5 md:px-3 py-2 md:py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] md:text-[11px] uppercase tracking-wide text-text-muted">
                          Webhooks
                        </p>
                        <Badge
                          variant={hasSessionWebhooks ? 'default' : 'destructive'}
                          className="text-[10px] md:text-[11px] px-1.5 md:px-2 py-0.5 md:py-1"
                        >
                          {hasSessionWebhooks ? 'Configurado' : 'Não configurado'}
                        </Badge>
                      </div>
                      {hasSessionWebhooks ? (
                        <div className="mt-1.5 md:mt-1.5 space-y-1">
                          {sessionWebhooks.slice(0, 2).map((hook, index) => (
                            <div
                              key={`${hook.url}-${index}`}
                              className="rounded-lg border border-white/5 bg-black/10 px-2 md:px-2 py-1.5 md:py-1.5"
                            >
                              <p className="text-[11px] md:text-xs text-text-primary break-words line-clamp-2">
                                {hook.url || 'URL não informada'}
                              </p>
                              <p className="mt-0.5 md:mt-0.5 text-[10px] md:text-[11px] text-text-muted break-words line-clamp-2">
                                {hook.events.length > 0
                                  ? hook.events.slice(0, 2).join(', ') + (hook.events.length > 2 ? '...' : '')
                                  : 'Sem eventos'}
                              </p>
                            </div>
                          ))}
                          {sessionWebhooks.length > 2 && (
                            <p className="text-[10px] md:text-xs text-text-muted">
                              +{sessionWebhooks.length - 2} webhooks adicionais
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-text-muted">
                          Nenhum webhook configurado.
                        </p>
                      )}
                    </div>

                    {isConnected && (
                      <>
                        <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs">
                          <div className="rounded-xl md:rounded-2xl border border-white/5 bg-white/5 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3">
                            <p className="text-[10px] md:text-xs text-text-muted">Criada em</p>
                            <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-white break-words">
                              {new Date(connection.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="rounded-xl md:rounded-2xl border border-white/5 bg-white/5 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 lg:py-3">
                            <p className="text-[10px] md:text-xs text-text-muted">Atualizada</p>
                            <p className="mt-0.5 md:mt-1 text-xs md:text-sm text-white break-words">
                              {new Date(connection.updatedAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center gap-1.5 md:gap-2 p-3 md:p-6 pt-3 md:pt-4">
                    {!isConnected && (
                      <Button
                        size="sm"
                        className="gap-1.5 md:gap-1.5 text-[11px] md:text-xs px-2 md:px-2.5 py-1.5 md:py-1.5"
                        onClick={() => openConnectDialog(connection)}
                        disabled={actionMutation.isLoading || qrMutation.isLoading}
                      >
                        <Play className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Conectar</span>
                        <span className="sm:hidden">Conectar</span>
                      </Button>
                    )}
                    {isConnected && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5 md:gap-1.5 text-[11px] md:text-xs px-2 md:px-2.5 py-1.5 md:py-1.5"
                          onClick={() => handleAction(connection.id, 'disconnect')}
                          disabled={actionMutation.isLoading}
                        >
                          <Power className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          <span className="hidden sm:inline">Desconectar</span>
                          <span className="sm:hidden">Descon.</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 text-text-muted"
                          onClick={() => handleAction(connection.id, 'reload')}
                          disabled={actionMutation.isLoading}
                        >
                          <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          <span className="hidden sm:inline">Recarregar</span>
                          <span className="sm:hidden">Atualizar</span>
                        </Button>
                      </>
                    )}


                    {!isConnected && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-auto gap-1.5 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2"
                        onClick={() => handleAction(connection.id, 'delete')}
                        disabled={actionMutation.isLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Remover</span>
                        <span className="sm:hidden">Remover</span>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-background-muted/40 py-24 text-center text-text-muted">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-secondary/20 text-brand-secondary">
              <QrCode className="h-8 w-8" />
            </div>
            <p className="mt-6 text-xl font-semibold text-white">
              Nenhuma conexão cadastrada
            </p>
            <p className="mt-2 max-w-lg text-sm text-text-muted">
              Inicie a criação de uma sessão WAHA para começar a operar. Ela aparecerá aqui automaticamente após o provisionamento pelo n8n.
            </p>
          </div>
        )}
      </div>

      <Dialog
        open={connectDialog.open}
        onOpenChange={(open) =>
          setConnectDialog((prev) => (open ? prev : { open, connection: null }))
        }
      >
        <DialogPortal>
          <DialogContent forceMount>
            <DialogHeader>
              <DialogTitle>
                Conectar sessão{' '}
                {connectDialog.connection?.name &&
                  `- ${connectDialog.connection.name}`}
              </DialogTitle>
              <DialogDescription>
                Escolha a forma de pareamento com o dispositivo WhatsApp: via QR Code
                ou código de autenticação.
              </DialogDescription>
            </DialogHeader>

            {connectDialog.connection ? (
              <>
                <div className="space-y-6">
                  <div className="flex w-fit rounded-full border border-white/10 bg-white/5 p-1 shadow-inner-glow">
                    {[
                      { key: 'qr', label: 'QR Code' },
                      { key: 'code', label: 'Código de autenticação' },
                    ].map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setConnectMode(option.key as 'qr' | 'code')}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          connectMode === option.key
                            ? 'bg-brand-primary text-white shadow-glow'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {connectMode === 'qr' ? (
                    <div className="space-y-4">
                      <p className="text-sm text-text-muted">
                        Clique em gerar para visualizar o QR Code. Escaneie em até 60 segundos
                        pelo aplicativo WhatsApp Business.
                      </p>
                      <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-white/10 bg-background-muted/70">
                        {qrMutation.isLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-brand-secondary" />
                        ) : qrResponse?.status?.toUpperCase() === 'WORKING' ? (
                          <div className="space-y-2 px-4 text-center">
                            <p className="text-lg font-semibold text-brand-success">
                              Sessão conectada!
                            </p>
                            <p className="text-sm text-text-muted">
                              O dispositivo já está autenticado. Use a ação &quot;Desconectar&quot;
                              no card para encerrar a sessão.
                            </p>
                          </div>
                        ) : qrResponse?.qr ? (
                          <img
                            src={`data:${qrResponse.mimetype || 'image/png'};base64,${qrResponse.qr}`}
                            alt="QR Code"
                            className="max-h-48 rounded-2xl border border-white/10"
                          />
                        ) : (
                          <p className="px-4 text-center text-sm text-text-muted">
                            QR Code ainda não gerado. Clique em &quot;Gerar QR&quot; para criar um novo código.
                          </p>
                        )}
                      </div>
                      {connectInfo?.status && (
                        <p className="text-center text-xs uppercase tracking-wide text-text-muted">
                          {/* Status atual: {connectInfo.status} */}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-text-muted">
                        Informe o número com código do país (ex.: +5511999999999). Um código
                        será enviado via WhatsApp para concluir o pareamento.
                      </p>
                      <div>
                        <Label htmlFor="auth-phone">Número do WhatsApp</Label>
                        <Input
                          id="auth-phone"
                          placeholder="+5511999999999"
                          value={authPhone}
                          onChange={(event) => {
                            setAuthPhone(event.target.value);
                            setAuthPhoneError(null);
                          }}
                        />
                        {authPhoneError && (
                          <p className="mt-2 text-xs text-brand-danger">{authPhoneError}</p>
                        )}
                      </div>
                      {connectCode && (
                        <div className="rounded-2xl border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-3 text-center">
                          <p className="text-xs uppercase tracking-wide text-brand-secondary">
                            Código de autenticação
                          </p>
                          <p className="mt-2 text-2xl font-mono text-white">{connectCode}</p>
                          <p className="mt-1 text-xs text-text-muted">
                            Insira este código no WhatsApp Business para concluir o pareamento.
                          </p>
                        </div>
                      )}
                      {connectInfo?.status && (
                        <p className="text-center text-xs uppercase tracking-wide text-text-muted">
                          Status atual: {connectInfo.status}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {statusError && (
                  <p className="text-sm text-brand-danger">{statusError}</p>
                )}

                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={closeConnectDialog}
                    disabled={actionMutation.isLoading || qrMutation.isLoading}
                  >
                    Cancelar
                  </Button>

                  {connectMode === 'qr' ? (
                    <Button onClick={handleGenerateQr} disabled={qrMutation.isLoading}>
                      {qrMutation.isLoading ? 'Gerando...' : 'Gerar QR'}
                    </Button>
                  ) : (
                    <Button onClick={handleSendAuthCode} disabled={actionMutation.isLoading}>
                      {actionMutation.isLoading ? 'Enviando...' : 'Enviar código'}
                    </Button>
                  )}
                </DialogFooter>
              </>
            ) : (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-text-muted">
                Selecione uma conexão para continuar.
              </div>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog
        open={webhooksDialog.open}
        onOpenChange={(open) =>
          open ? setWebhooksDialog((prev) => ({ ...prev, open: true })) : closeWebhooksDialog()
        }
      >
        <DialogPortal>
          <DialogContent forceMount>
            <DialogHeader>
              <DialogTitle>
                Webhooks avançados{' '}
                {webhooksDialog.connection?.name &&
                  `- ${webhooksDialog.connection.name}`}
              </DialogTitle>
              <DialogDescription>
                Configure até 3 webhooks para receber eventos da sessão selecionada.
              </DialogDescription>
            </DialogHeader>

            {webhooksError && (
              <div className="rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-brand-danger">
                {webhooksError}
              </div>
            )}

            <div className="space-y-4">
              {webhookForms.map((hook, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-background-soft/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Webhook {index + 1}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-brand-danger hover:text-brand-danger"
                      onClick={() => handleRemoveWebhook(index)}
                      disabled={webhooksLoading}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={hook.url}
                      onChange={(event) => handleWebhookChange(index, event.target.value)}
                      placeholder="https://seu-webhook.com/path"
                      disabled={webhooksLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Eventos (marque as opções desejadas)</Label>
                    <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-2xl border border-white/10 bg-background-muted/80 p-3">
                      {WEBHOOK_EVENT_OPTIONS.map((eventName) => {
                        const checked = hook.events.includes(eventName);
                        return (
                          <label
                            key={eventName}
                            className="flex items-center gap-2 text-sm text-text-muted hover:text-white"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-white/20 bg-transparent text-brand-secondary focus:ring-brand-secondary"
                              checked={checked}
                              onChange={() => toggleWebhookEvent(index, eventName)}
                              disabled={webhooksLoading}
                            />
                            <span className="truncate">{eventName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!webhooksLoading && webhookForms.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-background-soft/60 p-6 text-center text-sm text-text-muted">
                Nenhum webhook configurado. Clique em "Adicionar webhook" para incluir um novo destino.
              </div>
            )}

            {webhookForms.length < 3 && (
              <Button
                variant="outline"
                onClick={handleAddWebhook}
                disabled={webhooksLoading}
              >
                Adicionar webhook
              </Button>
            )}

            <DialogFooter>
              <Button
                variant="secondary"
                onClick={closeWebhooksDialog}
                disabled={webhooksLoading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveWebhooks} disabled={webhooksLoading}>
                {webhooksLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Modal de Gerenciar Automações */}
      {automationsDialog.open && automationsDialog.connection && (
        <ManageConnectionAutomationsModal
          connection={automationsDialog.connection}
          onClose={() => setAutomationsDialog({ open: false, connection: null })}
          onSuccess={() => {
            // Recarregar dados da conexão se necessário
            if (automationsDialog.connection) {
              refreshConnection(automationsDialog.connection.id);
            }
          }}
        />
      )}

      {/* Componente unificado para criar conexões */}
      <CreateConnectionDialog
        open={createConnectionOpen}
        onOpenChange={setCreateConnectionOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['connections'] });
          queryClient.invalidateQueries({ queryKey: ['social-connections'] });
        }}
      />
      </main>
      <Footer />
      <BottomNavigation />
    </div>
  );
}

