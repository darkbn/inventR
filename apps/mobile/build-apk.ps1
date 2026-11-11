<#
.SYNOPSIS
  Construit l'APK release d'InventAir.

.DESCRIPTION
  Rend la compilation reproductible depuis n'importe quel poste : le script
  localise la chaîne d'outils, vérifie les prérequis, puis enchaîne génération
  de code, analyse, tests et compilation. Il s'arrête à la première anomalie
  plutôt que de produire un APK issu d'un code non vérifié.

.PARAMETER ApiUrl
  Adresse par défaut du serveur, inscrite dans l'APK. Elle reste modifiable
  depuis l'écran de connexion : ce n'est qu'une valeur initiale.

.PARAMETER SplitPerAbi
  Produit un APK par architecture plutôt qu'un APK universel. Réduit la taille
  d'environ moitié, au prix d'un fichier à choisir selon le terminal.

.EXAMPLE
  .\build-apk.ps1 -ApiUrl http://192.168.1.20:3000/api/v1
#>
param(
  [string]$ApiUrl = 'http://192.168.1.100:3000/api/v1',
  [switch]$SplitPerAbi,
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$flutterHome = if ($env:FLUTTER_HOME) { $env:FLUTTER_HOME } else { 'C:\dev\flutter' }
$androidSdk  = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { 'C:\dev\android-sdk' }

function Step($message) {
  Write-Host ''
  Write-Host "=== $message ===" -ForegroundColor Cyan
}

function Fail($message) {
  Write-Host "✗ $message" -ForegroundColor Red
  exit 1
}

# --- Prérequis ------------------------------------------------------------------
Step 'Vérification de la chaîne d''outils'

$flutter = Join-Path $flutterHome 'bin\flutter.bat'
if (-not (Test-Path $flutter)) {
  Fail "Flutter introuvable dans $flutterHome. Voir README.md, section Prérequis."
}

if (-not (Test-Path (Join-Path $androidSdk 'platform-tools'))) {
  Fail "Android SDK introuvable dans $androidSdk. Voir README.md, section Prérequis."
}

if (-not $env:JAVA_HOME) {
  $javaCommand = Get-Command java -ErrorAction SilentlyContinue
  if (-not $javaCommand) { Fail 'JDK 17 introuvable.' }
  $env:JAVA_HOME = Split-Path (Split-Path $javaCommand.Source -Parent) -Parent
}

$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk
$env:PATH = "$flutterHome\bin;$androidSdk\platform-tools;$env:PATH"

Write-Host "  Flutter     : $flutterHome"
Write-Host "  Android SDK : $androidSdk"
Write-Host "  JDK         : $env:JAVA_HOME"

# local.properties est propre à chaque poste : on le régénère plutôt que de
# le versionner.
Set-Content -Path (Join-Path $projectRoot 'android\local.properties') -Encoding utf8 -Value @(
  "sdk.dir=$($androidSdk -replace '\\', '\\\\')",
  "flutter.sdk=$($flutterHome -replace '\\', '\\\\')"
)

# --- Signature --------------------------------------------------------------------
Step 'Signature'

$keyProperties = Join-Path $projectRoot 'android\key.properties'
if (Test-Path $keyProperties) {
  Write-Host '  Clé de release détectée : APK signé pour la production.'
} else {
  Write-Host '  Aucune clé de release : repli sur la clé de debug.' -ForegroundColor Yellow
  Write-Host '  L''APK sera installable, mais non signé pour la production.' -ForegroundColor Yellow
  Write-Host '  Voir README.md, section Signature.' -ForegroundColor Yellow
}

# --- Compilation ---------------------------------------------------------------------
Push-Location $projectRoot
try {
  Step 'Dépendances'
  & $flutter pub get
  if ($LASTEXITCODE -ne 0) { Fail 'Résolution des dépendances en échec.' }

  Step 'Génération du code (base locale)'
  & (Join-Path $flutterHome 'bin\dart.bat') run build_runner build
  if ($LASTEXITCODE -ne 0) { Fail 'Génération de code en échec.' }

  Step 'Analyse statique'
  & $flutter analyze
  if ($LASTEXITCODE -ne 0) { Fail 'Analyse statique en échec. Corrigez avant de compiler.' }

  if (-not $SkipTests) {
    Step 'Tests'
    & $flutter test
    if ($LASTEXITCODE -ne 0) { Fail 'Tests en échec. Corrigez avant de compiler.' }
  }

  Step "Compilation de l'APK (API par défaut : $ApiUrl)"
  $arguments = @('build', 'apk', '--release', "--dart-define=API_BASE_URL=$ApiUrl")
  if ($SplitPerAbi) { $arguments += '--split-per-abi' }

  & $flutter @arguments
  if ($LASTEXITCODE -ne 0) { Fail 'Compilation en échec.' }

  Step 'Résultat'
  $outputDir = Join-Path $projectRoot 'build\app\outputs\flutter-apk'
  Get-ChildItem $outputDir -Filter '*.apk' | ForEach-Object {
    $sizeMb = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name)  —  $sizeMb Mo" -ForegroundColor Green
    Write-Host "  $($_.FullName)"
  }

  Write-Host ''
  Write-Host 'Installation sur un terminal connecté en USB :' -ForegroundColor Cyan
  Write-Host "  adb install -r `"$outputDir\app-release.apk`""
} finally {
  Pop-Location
}
