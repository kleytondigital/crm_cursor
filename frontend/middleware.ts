import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Permitir acesso à página de login sem token
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next()
  }

  // Para outras rotas, verificar se há token no localStorage (será verificado no cliente)
  // O middleware do Next.js não tem acesso ao localStorage, então vamos deixar o controle no cliente
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

