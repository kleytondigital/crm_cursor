'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PoliticasPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8">
          <Link href="/login">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Login
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-brand-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Política de Privacidade
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-brand-primary" />
              1. Introdução
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos
              suas informações pessoais quando você utiliza nossa plataforma de CRM. Estamos
              comprometidos em proteger sua privacidade e garantir a segurança dos seus dados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand-primary" />
              2. Informações que Coletamos
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                <strong className="text-foreground">2.1. Informações de Conta:</strong> Coletamos
                informações como nome, endereço de e-mail, senha (criptografada) e informações de
                perfil quando você cria uma conta em nossa plataforma.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">2.2. Dados de Uso:</strong> Coletamos
                informações sobre como você interage com nossa plataforma, incluindo logs de
                acesso, ações realizadas e preferências de configuração.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">2.3. Dados de Comunicação:</strong> Quando você
                utiliza nossos serviços de mensageria, coletamos e armazenamos mensagens,
                conversas e dados relacionados para fornecer o serviço.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">2.4. Dados Técnicos:</strong> Coletamos
                informações técnicas como endereço IP, tipo de navegador, sistema operacional e
                dados de dispositivo para melhorar nossos serviços e segurança.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              3. Como Usamos suas Informações
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Fornecer, manter e melhorar nossos serviços</li>
                <li>Processar transações e gerenciar sua conta</li>
                <li>Enviar notificações importantes sobre o serviço</li>
                <li>Personalizar sua experiência na plataforma</li>
                <li>Detectar e prevenir fraudes e atividades suspeitas</li>
                <li>Cumprir obrigações legais e regulatórias</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Compartilhamento de Informações
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros,
              exceto nas seguintes situações:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-muted-foreground">
              <li>Com seu consentimento explícito</li>
              <li>Para cumprir obrigações legais ou responder a processos judiciais</li>
              <li>Com prestadores de serviços que nos auxiliam na operação da plataforma (sob
                acordos de confidencialidade)
              </li>
              <li>Em caso de fusão, aquisição ou venda de ativos (com notificação prévia)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Segurança dos Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas
              informações contra acesso não autorizado, alteração, divulgação ou destruição. Isso
              inclui:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-muted-foreground">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso baseados em função</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares e planos de recuperação de desastres</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Você tem o direito de:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir informações incorretas ou incompletas</li>
              <li>Solicitar a exclusão de suas informações pessoais</li>
              <li>Opor-se ao processamento de suas informações</li>
              <li>Solicitar a portabilidade dos seus dados</li>
              <li>Retirar seu consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              7. Retenção de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os
              propósitos descritos nesta política, a menos que um período de retenção mais longo
              seja exigido ou permitido por lei.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Cookies e Tecnologias Similares
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o
              uso da plataforma e personalizar conteúdo. Você pode gerenciar suas preferências de
              cookies através das configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Alterações nesta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você
              sobre mudanças significativas publicando a nova política nesta página e atualizando
              a data de "Última atualização".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Contato
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de
              Privacidade ou ao tratamento de suas informações pessoais, entre em contato conosco
              através dos canais de suporte disponíveis na plataforma.
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href="/login">
            <Button variant="outline">Voltar para Login</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

