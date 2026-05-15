# ============================================================
# Gera src/data/mara-lima-2022.json a partir dos dados do TSE
# Fonte: votacao_candidato_munzona_2022 (dados abertos TSE)
# Rodar UMA VEZ no terminal do projeto:
#   cd "BASE ANDRE SANTOS"
#   .\temporaria\fetch-mara-lima.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$url         = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"
$zipPath     = "$env:TEMP\tse_munzona_2022.zip"
$extractPath = "$env:TEMP\tse_munzona_2022"
$outputPath  = "src\data\mara-lima-2022.json"

# 1 — Download
if (-not (Test-Path $zipPath)) {
    Write-Host "Baixando dados TSE (arquivo ~400MB, aguarde)..." -ForegroundColor Cyan
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $zipPath)
    Write-Host "Download concluido." -ForegroundColor Green
} else {
    Write-Host "ZIP ja existe em $zipPath, pulando download." -ForegroundColor Yellow
}

# 2 — Extração
if (-not (Test-Path $extractPath)) {
    Write-Host "Extraindo..." -ForegroundColor Cyan
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
}

$csvFile = Get-ChildItem $extractPath -Filter "*munzona*.csv" -Recurse | Select-Object -First 1
if (-not $csvFile) {
    $csvFile = Get-ChildItem $extractPath -Filter "*.csv" -Recurse | Select-Object -First 1
}
Write-Host "CSV encontrado: $($csvFile.Name)" -ForegroundColor Green

# 3 — Leitura do cabeçalho (detecta separador e índices das colunas)
$firstLine = Get-Content $csvFile.FullName -Encoding UTF8 -TotalCount 1
$sep = if ($firstLine -match ";") { ";" } else { "," }
$header = $firstLine -split $sep | ForEach-Object { $_ -replace '"','' -replace "'",'' }

function Col($name) { [Array]::IndexOf($header, $name) }

$iUF     = Col "SG_UF"
$iCargo  = Col "DS_CARGO"
$iNome   = Col "NM_CANDIDATO"
$iCodMun = Col "CD_MUNICIPIO"
$iNomMun = Col "NM_MUNICIPIO"
$iVotos  = Col "QT_VOTOS_NOMINAIS"

Write-Host "Indices: UF=$iUF Cargo=$iCargo Nome=$iNome CodMun=$iCodMun NomMun=$iNomMun Votos=$iVotos" -ForegroundColor DarkGray

if ($iUF -lt 0 -or $iVotos -lt 0) {
    Write-Error "Colunas nao encontradas. Verifique o arquivo CSV extraido."
    exit 1
}

# 4 — Filtragem linha a linha (eficiente para arquivos grandes)
Write-Host "Filtrando dados de Mara Lima - PR (pode levar alguns minutos)..." -ForegroundColor Cyan

$municipios = @{}
$linhas = 0

Get-Content $csvFile.FullName -Encoding UTF8 | Select-Object -Skip 1 | ForEach-Object {
    $linhas++
    $cols = $_ -split $sep | ForEach-Object { $_ -replace '"','' }

    $uf    = if ($iUF   -ge 0 -and $cols.Count -gt $iUF)   { $cols[$iUF].Trim()   } else { "" }
    $cargo = if ($iCargo -ge 0 -and $cols.Count -gt $iCargo) { $cols[$iCargo].Trim() } else { "" }
    $nome  = if ($iNome  -ge 0 -and $cols.Count -gt $iNome)  { $cols[$iNome].Trim()  } else { "" }

    if ($uf -eq "PR" -and $cargo -match "Governador" -and $nome -match "MARA") {
        $cod = $cols[$iCodMun].Trim()
        $mun = $cols[$iNomMun].Trim()
        $vot = [int]($cols[$iVotos].Trim() -replace '[^0-9]','')

        if ($municipios.ContainsKey($cod)) {
            $municipios[$cod].votos += $vot
        } else {
            $municipios[$cod] = [PSCustomObject]@{
                codigo    = $cod
                municipio = $mun
                votos     = $vot
            }
        }
    }
}

Write-Host "$linhas linhas processadas, $($municipios.Count) municipios encontrados." -ForegroundColor Green

if ($municipios.Count -eq 0) {
    Write-Error "Nenhum dado encontrado. Verifique se o CSV tem as colunas esperadas."
    exit 1
}

# 5 — Montagem do JSON
$sorted    = $municipios.Values | Sort-Object votos -Descending
$totalVotos = ($sorted | Measure-Object votos -Sum).Sum

$output = [ordered]@{
    candidata  = "Mara Lima"
    partido    = "PSD"
    cargo      = "Governadora do Paraná"
    eleicao    = "Eleições Gerais 2022 - 1º turno"
    totalVotos = $totalVotos
    fonte      = "TSE - votacao_candidato_munzona_2022 (dadosabertos.tse.jus.br)"
    geradoEm   = (Get-Date -Format "yyyy-MM-dd")
    municipios = @($sorted)
}

New-Item -ItemType Directory -Force -Path "src\data" | Out-Null
$output | ConvertTo-Json -Depth 5 | Out-File -FilePath $outputPath -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Arquivo salvo: $outputPath" -ForegroundColor Green
Write-Host "  Municipios   : $($sorted.Count)" -ForegroundColor Green
Write-Host "  Total votos  : $($totalVotos.ToString('N0'))" -ForegroundColor Green
Write-Host "  Proximo passo: git add src/data/mara-lima-2022.json && git push" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
