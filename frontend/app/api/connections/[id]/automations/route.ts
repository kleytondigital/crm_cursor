import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    )
  }

  const authHeaders = getAuthHeaders(req)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  }

  const response = await fetch(
    `${API_URL}/connections/${params.id}/automations`,
    {
      method: 'GET',
      headers,
    },
  )

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

