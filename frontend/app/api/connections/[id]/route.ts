import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const authorization = req.headers.get('authorization');
  if (authorization) {
    return { Authorization: authorization };
  }
  return {};
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { action, ...payload } = body ?? {};

  if (!action) {
    return NextResponse.json(
      { message: 'Ação não informada' },
      { status: 400 },
    );
  }

  const authHeaders = getAuthHeaders(req);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const response = await fetch(
    `${API_URL}/connections/${params.id}/actions/${action}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload || {}),
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

