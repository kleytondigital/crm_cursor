'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

const N8N_WEBHOOK_URL = 'https://controle-de-envio-n8n-webhook.y0q0vs.easypanel.host/webhook/extended-token';

interface SocialConnectionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: {
    id: string;
    name: string;
    provider: 'INSTAGRAM' | 'FACEBOOK';
    metadata?: {
      permissions?: string[];
      accessToken?: string;
      tokenExpiresAt?: string;
      pageName?: string;
      instagramUsername?: string;
    };
    refreshToken?: string | null;
  } | null;
}

export default function SocialConnectionSettingsDialog({
  open,
  onOpenChange,
  connection,
}: SocialConnectionSettingsDialogProps) {
  const [extendingToken, setExtendingToken] = useState<'oauth' | 'graph' | null>(null);
  const [extensionResult, setExtensionResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const permissions = connection?.metadata?.permissions || [];
  const tokenExpiresAt = connection?.metadata?.tokenExpiresAt;
  const isExpired = tokenExpiresAt ? new Date(tokenExpiresAt) < new Date() : false;
  const daysUntilExpiration = tokenExpiresAt
    ? Math.ceil((new Date(tokenExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const extendTokenMutation = useMutation({
    mutationFn: async (tokenType: 'oauth' | 'graph') => {
      if (!connection) {
        throw new Error('Conexão não encontrada');
      }

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: connection.id,
          provider: connection.provider,
          tokenType, // 'oauth' ou 'graph'
          accessToken: connection.metadata?.accessToken,
          refreshToken: connection.refreshToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || 'Erro ao estender token');
      }

      return response.json();
    },
    onSuccess: (data, tokenType) => {
      setExtensionResult({
        type: 'success',
        message: `Token ${tokenType === 'oauth' ? 'OAuth' : 'Graph API'} estendido com sucesso!`,
      });
      setTimeout(() => {
        setExtensionResult(null);
        onOpenChange(false);
        // Recarregar página para atualizar dados
        window.location.reload();
      }, 2000);
    },
    onError: (error: any) => {
      setExtensionResult({
        type: 'error',
        message: error.message || 'Erro ao estender token. Tente novamente.',
      });
      setTimeout(() => setExtensionResult(null), 5000);
    },
    onSettled: () => {
      setExtendingToken(null);
    },
  });

  const handleExtendToken = (tokenType: 'oauth' | 'graph') => {
    setExtendingToken(tokenType);
    setExtensionResult(null);
    extendTokenMutation.mutate(tokenType);
  };

  if (!connection) {
    return null;
  }

  const commonPermissions = [
    'pages_show_list',
    'pages_messaging',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
    'business_management',
    'read_insights',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogContent forceMount className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Configurações</span>
              <span className="text-sm font-normal text-text-muted">
                - {connection.name}
              </span>
            </DialogTitle>
            <DialogDescription>
              Gerencie permissões e tokens de acesso da conexão social.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Permissões */}
            <div className="rounded-2xl border border-white/10 bg-background-soft/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Permissões do App</h3>
                <Badge variant="outline" className="text-xs">
                  {permissions.length} permissões
                </Badge>
              </div>

              {permissions.length > 0 ? (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div
                      key={permission}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-black/10 px-3 py-2"
                    >
                      <span className="text-xs text-text-primary font-mono">
                        {permission}
                      </span>
                      <Check className="h-4 w-4 text-brand-success" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-white/5 bg-black/10 px-3 py-4 text-center">
                  <p className="text-xs text-text-muted">
                    Nenhuma permissão registrada
                  </p>
                </div>
              )}

              {/* Lista de permissões comuns para referência */}
              <details className="mt-4">
                <summary className="text-xs text-text-muted cursor-pointer hover:text-white">
                  Ver permissões comuns necessárias
                </summary>
                <div className="mt-2 space-y-1">
                  {commonPermissions.map((perm) => (
                    <div
                      key={perm}
                      className={`text-xs font-mono px-2 py-1 rounded ${
                        permissions.includes(perm)
                          ? 'bg-brand-success/20 text-brand-success'
                          : 'bg-black/20 text-text-muted'
                      }`}
                    >
                      {perm}
                      {permissions.includes(perm) && (
                        <Check className="h-3 w-3 inline-block ml-1" />
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* Status do Token */}
            <div className="rounded-2xl border border-white/10 bg-background-soft/60 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Status dos Tokens</h3>

              {tokenExpiresAt && (
                <div
                  className={`rounded-lg border px-3 py-2 ${
                    isExpired
                      ? 'border-brand-danger/30 bg-brand-danger/10'
                      : daysUntilExpiration && daysUntilExpiration < 7
                      ? 'border-warning/30 bg-warning/10'
                      : 'border-brand-success/30 bg-brand-success/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-primary">
                      Token de Acesso (Graph API)
                    </span>
                    {isExpired ? (
                      <Badge variant="destructive" className="text-xs">
                        Expirado
                      </Badge>
                    ) : daysUntilExpiration !== null ? (
                      <Badge
                        variant={daysUntilExpiration < 7 ? 'warning' : 'default'}
                        className="text-xs"
                      >
                        Expira em {daysUntilExpiration} {daysUntilExpiration === 1 ? 'dia' : 'dias'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Sem data de expiração
                      </Badge>
                    )}
                  </div>
                  {tokenExpiresAt && (
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(tokenExpiresAt).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              {/* Botões para estender tokens */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white">Estender Token OAuth</p>
                    <p className="text-xs text-text-muted">
                      Renova o token usado para login e autenticação
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExtendToken('oauth')}
                    disabled={extendingToken !== null}
                    className="gap-2"
                  >
                    {extendingToken === 'oauth' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Estendendo...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Estender
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white">Estender Token Graph API</p>
                    <p className="text-xs text-text-muted">
                      Renova o token usado para mensagens e operações
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExtendToken('graph')}
                    disabled={extendingToken !== null}
                    className="gap-2"
                  >
                    {extendingToken === 'graph' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Estendendo...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Estender
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Resultado da extensão */}
              {extensionResult && (
                <div
                  className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${
                    extensionResult.type === 'success'
                      ? 'border-brand-success/30 bg-brand-success/10'
                      : 'border-brand-danger/30 bg-brand-danger/10'
                  }`}
                >
                  {extensionResult.type === 'success' ? (
                    <Check className="h-4 w-4 text-brand-success mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-brand-danger mt-0.5 flex-shrink-0" />
                  )}
                  <p
                    className={`text-xs ${
                      extensionResult.type === 'success'
                        ? 'text-brand-success'
                        : 'text-brand-danger'
                    }`}
                  >
                    {extensionResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

