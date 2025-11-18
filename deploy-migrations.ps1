# Script para executar migrations no servidor de produção

Write-Host "🚀 Executando migrations no banco de produção..." -ForegroundColor Cyan

# Executar migrations
npx prisma migrate deploy

# Gerar Prisma Client  
npx prisma generate

Write-Host "✅ Migrations executadas com sucesso!" -ForegroundColor Green
Write-Host "📝 Não esqueça de reiniciar o backend após as migrations" -ForegroundColor Yellow

