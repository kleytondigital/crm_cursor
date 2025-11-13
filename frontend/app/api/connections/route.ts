import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WAHA_WEBHOOK =
  process.env.NEXT_PUBLIC_WAHA_WEBHOOK || process.env.WAHA_WEBHOOK || '';

function getAuthHeaders(req: NextRequest): Record<string, string> {
  const authorization = req.headers.get('authorization');
  if (authorization) {
    return { Authorization: authorization };
  }
  return {};
}

export async function GET(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    );
  }

  const authHeaders = getAuthHeaders(req);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const response = await fetch(`${API_URL}/connections`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

export async function POST(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    );
  }

  const { name } = await req.json();

  if (!name) {
    return NextResponse.json(
      { message: 'Nome da conexão é obrigatório' },
      { status: 400 },
    );
  }

  const payload = {
    name,
    start: true,
    config: {
      proxy: null,
      debug: false,
      ignore: { status: null, groups: null, channels: null },
      webhooks:
        WAHA_WEBHOOK.length > 0
          ? [
              {
                url: WAHA_WEBHOOK,
                events: ['message'],
              },
            ]
          : [],
    },
  };

  const authHeaders = getAuthHeaders(req);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const response = await fetch(`${API_URL}/connections`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

