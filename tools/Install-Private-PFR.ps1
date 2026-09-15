$ErrorActionPreference = 'Stop'
$RepoRaw = 'https://raw.githubusercontent.com/trentluckhurst1-create/melbourne-cup-hub/main'
$PrivateRoot = Join-Path $HOME 'Documents\MelbourneCupHubPrivate'
$DataPath = Join-Path $PrivateRoot 'pfr-private.json'
$ServerPath = Join-Path $PrivateRoot 'private_pfr_server.py'
$LauncherPath = Join-Path $PrivateRoot 'Start-Melbourne-Cup-Hub-Private.ps1'
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Melbourne Cup Hub Private.lnk'
$HubUrl = 'https://trentluckhurst1-create.github.io/melbourne-cup-hub/'

New-Item -ItemType Directory -Force -Path $PrivateRoot | Out-Null
Invoke-WebRequest "$RepoRaw/tools/private_pfr_server.py" -OutFile $ServerPath

if (-not (Test-Path $DataPath)) {
    $searchRoots = @((Join-Path $HOME 'Downloads'), (Join-Path $HOME 'Documents')) | Where-Object { Test-Path $_ }
    $candidate = Get-ChildItem $searchRoots -File -Filter '*.json' -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match 'timeform-private-projected24|timeform.*private|2026-09-15-timeform-private' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $candidate) {
        throw "Private ratings JSON was not found automatically. Put the downloaded private JSON in Downloads and run this installer again."
    }
    Copy-Item $candidate.FullName $DataPath -Force
}

$launcher = @'
$ErrorActionPreference = 'Stop'
$root = Join-Path $HOME 'Documents\MelbourneCupHubPrivate'
$data = Join-Path $root 'pfr-private.json'
$server = Join-Path $root 'private_pfr_server.py'
$env:MCH_PFR_DATA = $data
$existing = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
    Start-Process -WindowStyle Hidden -FilePath 'python' -ArgumentList @($server)
    Start-Sleep -Milliseconds 900
}
Start-Process 'https://trentluckhurst1-create.github.io/melbourne-cup-hub/'
'@
Set-Content -Path $LauncherPath -Value $launcher -Encoding UTF8

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($DesktopShortcut)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`""
$shortcut.WorkingDirectory = $PrivateRoot
$shortcut.Description = 'Open Melbourne Cup Hub with private PFR ratings'
$shortcut.Save()

Write-Host ''
Write-Host 'PRIVATE PFR SETUP COMPLETE' -ForegroundColor Green
Write-Host "Private data: $DataPath"
Write-Host "Desktop shortcut: $DesktopShortcut"
Write-Host 'Opening the Hub now...'
& $LauncherPath
