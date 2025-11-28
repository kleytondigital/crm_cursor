'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TermosServicoPage() {
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
            <FileText className="h-8 w-8 text-brand-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Termos de Serviço
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-brand-primary" />
              1. Aceitação dos Termos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e utilizar esta plataforma de CRM, você concorda em cumprir e estar
              vinculado a estes Termos de Serviço. Se você não concorda com qualquer parte destes
              termos, não deve utilizar nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-primary" />
              2. Descrição do Serviço
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Nossa plataforma oferece serviços de gerenciamento de relacionamento com clientes
              (CRM), incluindo mas não limitado a:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3 text-muted-foreground">
              <li>Gerenciamento de leads e contatos</li>
              <li>Comunicação via mensageria (WhatsApp, Instagram, Facebook)</li>
              <li>Atendimento ao cliente e gestão de tickets</li>
              <li>Automações e workflows</li>
              <li>Relatórios e análises</li>
              <li>Integrações com sistemas terceiros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-brand-primary" />
              3. Conta de Usuário
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                <strong className="text-foreground">3.1. Registro:</strong> Para utilizar nossos
                serviços, você deve criar uma conta fornecendo informações precisas e completas.
                Você é responsável por manter a confidencialidade de suas credenciais de acesso.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">3.2. Responsabilidades:</strong> Você é
                responsável por todas as atividades que ocorrem sob sua conta. Notifique-nos
                imediatamente sobre qualquer uso não autorizado de sua conta.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">3.3. Idade Mínima:</strong> Você deve ter pelo
                menos 18 anos de idade ou ter o consentimento de um responsável legal para utilizar
                nossos serviços.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              4. Uso Aceitável
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Você concorda em não utilizar nossos serviços para:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-muted-foreground">
              <li>Atividades ilegais ou não autorizadas</li>
              <li>Envio de spam, mensagens não solicitadas ou conteúdo abusivo</li>
              <li>Violar direitos de propriedade intelectual de terceiros</li>
              <li>Interferir ou interromper o funcionamento da plataforma</li>
              <li>Tentar obter acesso não autorizado a sistemas ou dados</li>
              <li>Transmitir vírus, malware ou código malicioso</li>
              <li>Coletar informações de outros usuários sem autorização</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              5. Propriedade Intelectual
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo da plataforma, incluindo mas não limitado a textos, gráficos, logos,
              ícones, imagens, compilações de dados e software, é propriedade nossa ou de nossos
              licenciadores e está protegido por leis de direitos autorais e outras leis de
              propriedade intelectual.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              6. Dados e Conteúdo do Usuário
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <p className="leading-relaxed">
                <strong className="text-foreground">6.1. Propriedade:</strong> Você mantém todos os
                direitos sobre os dados e conteúdo que você envia, publica ou armazena através de
                nossos serviços.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">6.2. Licença:</strong> Ao utilizar nossos
                serviços, você nos concede uma licença limitada, não exclusiva e revogável para
                usar, armazenar e processar seus dados conforme necessário para fornecer e melhorar
                nossos serviços.
              </p>
              <p className="leading-relaxed">
                <strong className="text-foreground">6.3. Backup:</strong> Embora façamos backups
                regulares, você é responsável por manter cópias de segurança dos seus dados
                importantes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-brand-primary" />
              7. Limitação de Responsabilidade
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Nossos serviços são fornecidos "como estão" e "conforme disponíveis". Não garantimos
              que os serviços serão ininterruptos, livres de erros ou seguros. Em nenhuma
              circunstância seremos responsáveis por danos diretos, indiretos, incidentais,
              especiais ou consequenciais resultantes do uso ou incapacidade de usar nossos
              serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              8. Modificações do Serviço
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto dos
              serviços a qualquer momento, com ou sem aviso prévio. Não seremos responsáveis por
              qualquer modificação, suspensão ou descontinuação dos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              9. Rescisão
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos encerrar ou suspender sua conta e acesso aos serviços imediatamente, sem
              aviso prévio, por qualquer motivo, incluindo se você violar estes Termos de Serviço.
              Após a rescisão, seu direito de usar os serviços cessará imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              10. Lei Aplicável
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos de Serviço são regidos pelas leis do Brasil. Qualquer disputa relacionada
              a estes termos será resolvida nos tribunais competentes do Brasil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              11. Alterações nos Termos
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Reservamo-nos o direito de modificar estes Termos de Serviço a qualquer momento.
              Alterações significativas serão notificadas através da plataforma ou por e-mail. O uso
              continuado dos serviços após tais modificações constitui sua aceitação dos novos
              termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              12. Contato
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver dúvidas sobre estes Termos de Serviço, entre em contato conosco através
              dos canais de suporte disponíveis na plataforma.
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

