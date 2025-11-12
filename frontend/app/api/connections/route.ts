import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const WAHA_WEBHOOK =
  process.env.NEXT_PUBLIC_WAHA_WEBHOOK || process.env.WAHA_WEBHOOK || '';

function getAuthHeaders(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  return authorization ? { Authorization: authorization } : {};
}

export async function GET(req: NextRequest) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    );
  }

  const response = await fetch(`${API_URL}/connections`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(req),
    },
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

  const response = await fetch(`${API_URL}/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(req),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

