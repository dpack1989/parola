[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$InboundPath = "INBOUND\vokabeln.txt",
    [string]$DataPath = "data\vocabulary.json",
    [string]$RulesPath = "tools\vocabulary-rules.json",
    [string]$ArchiveDirectory = "INBOUND\Archiv"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Resolve-ProjectPath {
    param([string]$Path)
    if ([IO.Path]::IsPathRooted($Path)) { return [IO.Path]::GetFullPath($Path) }
    return [IO.Path]::GetFullPath((Join-Path $ProjectRoot $Path))
}

function Normalize-Key {
    param([string]$Value)
    return $Value.Trim().ToLowerInvariant()
}

function New-CatalogId {
    param([string]$Italian)
    $bytes = [Text.Encoding]::UTF8.GetBytes((Normalize-Key $Italian))
    $hash = [Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
    $shortHash = ([BitConverter]::ToString($hash)).Replace("-", "").Substring(0, 16).ToLowerInvariant()
    return "catalog-$shortHash"
}

$InboundFile = Resolve-ProjectPath $InboundPath
$DataFile = Resolve-ProjectPath $DataPath
$RulesFile = Resolve-ProjectPath $RulesPath
$ArchiveFolder = Resolve-ProjectPath $ArchiveDirectory

if (-not (Test-Path -LiteralPath $InboundFile -PathType Leaf)) {
    throw "Eingabedatei nicht gefunden: $InboundFile"
}
if (-not (Test-Path -LiteralPath $RulesFile -PathType Leaf)) {
    throw "Regeldatei nicht gefunden: $RulesFile"
}

$lines = @(Get-Content -LiteralPath $InboundFile -Encoding UTF8 | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($lines.Count -eq 0 -or $lines.Count % 2 -ne 0) {
    throw "Die TXT-Datei muss aus Paaren bestehen: Italienisch, Deutsch, Leerzeile. Gefundene Inhaltszeilen: $($lines.Count)."
}

$rules = Get-Content -LiteralPath $RulesFile -Raw -Encoding UTF8 | ConvertFrom-Json
$categoryByWord = @{}
foreach ($category in $rules.categories.PSObject.Properties) {
    foreach ($word in $category.Value) {
        $key = Normalize-Key ([string]$word)
        if ($categoryByWord.ContainsKey($key)) {
            throw "Das Wort '$word' steht in mehreren Kategorien."
        }
        $categoryByWord[$key] = $category.Name
    }
}

$translationByWord = @{}
foreach ($translation in $rules.translations.PSObject.Properties) {
    $translationByWord[(Normalize-Key $translation.Name)] = [string]$translation.Value
}

$existingWords = @()
if (Test-Path -LiteralPath $DataFile -PathType Leaf) {
    $existingData = Get-Content -LiteralPath $DataFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $existingWords = @($existingData.words)
}

$wordByKey = @{}
foreach ($word in $existingWords) {
    $wordByKey[(Normalize-Key ([string]$word.italian))] = $word
}

$added = 0
$updated = 0
$uncategorized = New-Object Collections.Generic.List[string]
$importedAt = [DateTime]::UtcNow.ToString("o")

for ($index = 0; $index -lt $lines.Count; $index += 2) {
    $italian = $lines[$index]
    $rawGerman = $lines[$index + 1]
    $key = Normalize-Key $italian
    $german = if ($translationByWord.ContainsKey($key)) { $translationByWord[$key] } else { $rawGerman }
    $category = if ($categoryByWord.ContainsKey($key)) { $categoryByWord[$key] } elseif ($wordByKey.ContainsKey($key) -and $wordByKey[$key].group) { [string]$wordByKey[$key].group } else { "Neu / prüfen" }

    if ($category -eq "Neu / prüfen") { $uncategorized.Add($italian) }

    if ($wordByKey.ContainsKey($key)) {
        $word = $wordByKey[$key]
        $word.italian = $italian
        $word.german = $german
        $word.group = $category
        $word.catalogUpdatedAt = $importedAt
        $updated += 1
    } else {
        $word = [PSCustomObject]@{
            id = New-CatalogId $italian
            italian = $italian
            german = $german
            group = $category
            note = ""
            source = "catalog"
            catalogUpdatedAt = $importedAt
        }
        $wordByKey[$key] = $word
        $added += 1
    }
}

$catalog = [ordered]@{
    version = [DateTime]::UtcNow.ToString("yyyyMMddHHmmss")
    generatedAt = $importedAt
    sourceFile = [IO.Path]::GetFileName($InboundFile)
    words = @($wordByKey.Values | Sort-Object italian)
}

$dataFolder = Split-Path -Parent $DataFile
if (-not (Test-Path -LiteralPath $dataFolder)) { New-Item -ItemType Directory -Path $dataFolder | Out-Null }
$json = $catalog | ConvertTo-Json -Depth 10
[IO.File]::WriteAllText($DataFile, $json, (New-Object Text.UTF8Encoding($false)))

if (-not (Test-Path -LiteralPath $ArchiveFolder)) { New-Item -ItemType Directory -Path $ArchiveFolder | Out-Null }
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "{0}-geladen-{1}{2}" -f [IO.Path]::GetFileNameWithoutExtension($InboundFile), $timestamp, [IO.Path]::GetExtension($InboundFile)
$archivePath = Join-Path $ArchiveFolder $archiveName
if ($PSCmdlet.ShouldProcess($InboundFile, "nach '$archivePath' verschieben")) {
    Move-Item -LiteralPath $InboundFile -Destination $archivePath
}

Write-Host "Import abgeschlossen: $added neu, $updated aktualisiert, $($catalog.words.Count) insgesamt."
Write-Host "Archiv: $archivePath"
if ($uncategorized.Count) {
    Write-Warning ("Noch zuzuordnen: " + ($uncategorized -join ", "))
}
