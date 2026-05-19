# ============================================================
# Gera dep-estaduais-municipios.json e dep-federais-municipios.json
# a partir do CSV do TSE (Paraná 2022)
# Rodar: .\temporaria\fetch-eleitos-municipios.ps1
# ============================================================

$csvPath = "temporaria\votacao_candidato_munzona_2022\votacao_candidato_munzona_2022_PR.csv"

if (-not (Test-Path $csvPath)) {
    Write-Error "CSV nao encontrado em: $csvPath"
    exit 1
}

Write-Host "Lendo CSV do Parana (271 MB — aguarde)..." -ForegroundColor Cyan

$rows = Import-Csv -Path $csvPath -Delimiter ";" -Encoding Default

Write-Host "CSV carregado. Filtrando eleitos..." -ForegroundColor Cyan

function Build-MunicipioDict {
    param (
        [array]$rows,
        [string]$cargo
    )

    # ^ELEITO captura ELEITO, ELEITO POR QP e ELEITO POR M?DIA (encoding do CSV)
    # sem capturar "N?O ELEITO" / "NAO ELEITO"
    $filtered = $rows | Where-Object {
        $_.DS_CARGO -match $cargo -and
        $_.DS_SIT_TOT_TURNO -match "^ELEITO"
    }

    $grouped = $filtered | Group-Object NM_URNA_CANDIDATO

    $dict = [ordered]@{}

    foreach ($cand in $grouped) {
        $municipios = $cand.Group |
            Group-Object CD_MUNICIPIO |
            ForEach-Object {
                [PSCustomObject]@{
                    codigo    = $_.Name
                    municipio = ($_.Group | Select-Object -First 1).NM_MUNICIPIO
                    votos     = [int](($_.Group | Measure-Object QT_VOTOS_NOMINAIS -Sum).Sum)
                }
            } | Sort-Object votos -Descending

        $dict[$cand.Name] = @($municipios)
    }

    return $dict
}

# Dep. Estaduais
Write-Host "Processando Deputados Estaduais..." -ForegroundColor Yellow
$estaduais = Build-MunicipioDict -rows $rows -cargo "Deputado Estadual"
$outEstadual = "src\data\eleitos-2022\dep-estaduais-municipios.json"
$estaduais | ConvertTo-Json -Depth 5 | Out-File -FilePath $outEstadual -Encoding UTF8 -NoNewline
Write-Host "  Candidatos: $($estaduais.Count)  →  $outEstadual" -ForegroundColor Green

# Dep. Federais
Write-Host "Processando Deputados Federais..." -ForegroundColor Yellow
$federais = Build-MunicipioDict -rows $rows -cargo "Deputado Federal"
$outFederal = "src\data\eleitos-2022\dep-federais-municipios.json"
$federais | ConvertTo-Json -Depth 5 | Out-File -FilePath $outFederal -Encoding UTF8 -NoNewline
Write-Host "  Candidatos: $($federais.Count)  →  $outFederal" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Concluido!" -ForegroundColor Green
Write-Host "  Proximo: git add src/data/eleitos-2022/*.json && git push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
