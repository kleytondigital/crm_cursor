import type { Metadata } from 'next';
import './globals.css';
import QueryClientProviderWrapper from '@/components/providers/query-client-provider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'B2X CRM',
  description: 'Sistema CRM para gestão de leads e atendimento',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable}`}>
      <body className="antialiased min-h-screen bg-background text-text-primary">
        <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
      </body>
    </html>
  );
}

