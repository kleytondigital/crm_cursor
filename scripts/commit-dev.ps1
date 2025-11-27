# Script PowerShell para facilitar commits na branch developer
# Uso: .\scripts\commit-dev.ps1 "mensagem do commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

# Verificar se está na branch developer
$currentBranch = git branch --show-current
if ($currentBranch -ne "developer") {
    Write-Host "⚠️  Você não está na branch developer!" -ForegroundColor Yellow
    Write-Host "Branch atual: $currentBranch" -ForegroundColor Yellow
    $continue = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "Operação cancelada." -ForegroundColor Red
        exit 1
    }
}

# Verificar status
Write-Host "`n📋 Verificando status..." -ForegroundColor Cyan
git status --short

# Verificar se há alterações
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "`n✅ Não há alterações para commitar." -ForegroundColor Green
    exit 0
}

# Mostrar diferenças
Write-Host "`n📊 Diferenças:" -ForegroundColor Cyan
git diff --stat

# Confirmar
Write-Host "`n💬 Mensagem do commit: $Message" -ForegroundColor Yellow
$confirm = Read-Host "Deseja continuar com o commit? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Operação cancelada." -ForegroundColor Red
    exit 0
}

# Adicionar todos os arquivos
Write-Host "`n➕ Adicionando arquivos..." -ForegroundColor Cyan
git add .

# Fazer commit
Write-Host "💾 Fazendo commit..." -ForegroundColor Cyan
git commit -m $Message

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Commit realizado com sucesso!" -ForegroundColor Green
    
    # Perguntar se deseja fazer push
    $push = Read-Host "`nDeseja fazer push para origin/developer? (s/N)"
    if ($push -eq "s" -or $push -eq "S") {
        Write-Host "🚀 Fazendo push..." -ForegroundColor Cyan
        git push origin developer
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "❌ Erro ao fazer push." -ForegroundColor Red
        }
    }
} else {
    Write-Host "`n❌ Erro ao fazer commit." -ForegroundColor Red
    exit 1
}

