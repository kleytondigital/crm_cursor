import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json')
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent)

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao ler manifest.json:', error)
    return NextResponse.json(
      { error: 'Manifest não encontrado' },
      { status: 404 }
    )
  }
}

