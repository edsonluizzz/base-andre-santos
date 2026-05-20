# ============================================================
# Inicializa o schema Prisma em um novo banco Neon (novo tenant)
# Uso: .\temporaria\init-tenant-db.ps1 -DbUrl "postgresql://..."
# ============================================================

param (
    [Parameter(Mandatory = $true)]
    [string]$DbUrl
)

$schemaPath = "prisma\schema.prisma"

if (-not (Test-Path $schemaPath)) {
    Write-Error "Schema nao encontrado em: $schemaPath. Execute na raiz do projeto."
    exit 1
}

Write-Host ""
Write-Host "Inicializando banco do novo tenant..." -ForegroundColor Cyan
Write-Host "URL: $($DbUrl.Substring(0, [Math]::Min(40, $DbUrl.Length)))..." -ForegroundColor DarkGray

$env:DATABASE_URL = $DbUrl

try {
    $result = npx prisma db push --schema $schemaPath --accept-data-loss 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host $result
        Write-Error "Falha ao aplicar schema. Verifique a URL e tente novamente."
        exit 1
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  Schema aplicado com sucesso!"              -ForegroundColor Green
    Write-Host ""
    Write-Host "  Proximo passo:"                            -ForegroundColor Cyan
    Write-Host "  1. Acesse /nova-campanha no sistema"       -ForegroundColor Cyan
    Write-Host "  2. Preencha os dados da campanha"          -ForegroundColor Cyan
    Write-Host "  3. Cole esta URL no campo DATABASE_URL:"   -ForegroundColor Cyan
    Write-Host "     $DbUrl"                                 -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
} finally {
    # Restaurar a variavel de ambiente original
    Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
}
