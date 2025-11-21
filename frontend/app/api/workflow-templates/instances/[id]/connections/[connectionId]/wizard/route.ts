import { NextRequest, NextResponse } from 'next/server'
import { getAuthHeaders } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; connectionId: string } },
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
    `${API_URL}/workflow-templates/instances/${params.id}/connections/${params.connectionId}/wizard`,
    {
      method: 'POST',
      headers,
    },
  )

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

