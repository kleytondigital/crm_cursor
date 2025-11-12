import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getAuthHeaders(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  return authorization ? { Authorization: authorization } : {};
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!API_URL) {
    return NextResponse.json(
      { message: 'API URL não configurada' },
      { status: 500 },
    );
  }

  const response = await fetch(
    `${API_URL}/connections/${params.id}/qr`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(req),
      },
      cache: 'no-store',
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

