# ============================================================
# Gera src/data/mara-lima-2022.json a partir do CSV do TSE
# CSV esperado em: temporaria\votacao_candidato_munzona_2022\votacao_candidato_munzona_2022_PR.csv
# Rodar: .\temporaria\fetch-mara-lima.ps1
# ============================================================

$csvPath    = "temporaria\votacao_candidato_munzona_2022\votacao_candidato_munzona_2022_PR.csv"
$outputPath = "src\data\mara-lima-2022.json"

if (-not (Test-Path $csvPath)) {
    Write-Error "CSV nao encontrado em: $csvPath"
    exit 1
}

Write-Host "Lendo CSV do Parana (CP1252)..." -ForegroundColor Cyan

$enc  = [System.Text.Encoding]::GetEncoding(1252)
$rows = [System.IO.File]::ReadAllLines($csvPath, $enc) | ConvertFrom-Csv -Delimiter ";"

# Filtro exato por NM_URNA_CANDIDATO = "CANTORA MARA LIMA" (Republicanos, eleita 2022)
$data = $rows |
    Where-Object { $_.DS_CARGO -match "Deputado Estadual" -and $_.NM_URNA_CANDIDATO -eq "CANTORA MARA LIMA" } |
    Group-Object CD_MUNICIPIO |
    ForEach-Object {
        [PSCustomObject]@{
            codigo    = $_.Name
            municipio = ($_.Group | Select-Object -First 1).NM_MUNICIPIO
            votos     = [int](($_.Group | Measure-Object QT_VOTOS_NOMINAIS -Sum).Sum)
        }
    } | Sort-Object votos -Descending

if ($data.Count -eq 0) {
    Write-Error "Nenhum dado encontrado para CANTORA MARA LIMA. Verifique o CSV."
    exit 1
}

$total = ($data | Measure-Object votos -Sum).Sum

$output = [ordered]@{
    candidata  = "Cantora Mara Lima"
    partido    = "Republicanos"
    cargo      = "Deputada Estadual PR"
    eleicao    = "Eleicoes Gerais 2022 - 1o turno"
    totalVotos = $total
    fonte      = "TSE - votacao_candidato_munzona_2022_PR.csv"
    geradoEm   = (Get-Date -Format "yyyy-MM-dd")
    municipios = @($data)
}

New-Item -ItemType Directory -Force -Path "src\data" | Out-Null
$output | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputPath -Encoding UTF8NoBOM -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Arquivo : $outputPath"                     -ForegroundColor Green
Write-Host "  Municipios: $($data.Count)"                -ForegroundColor Green
Write-Host "  Total votos: $($total.ToString('N0'))"     -ForegroundColor Green
Write-Host "  Proximo: git add src/data/mara-lima-2022.json && git push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
