$ErrorActionPreference = 'Stop'
$RepoUrl = 'https://github.com/trentluckhurst1-create/melbourne-cup-hub.git'
$PrivateRoot = Join-Path $HOME 'Documents\MelbourneCupHubPrivate'
$RepoPath = Join-Path $PrivateRoot 'melbourne-cup-hub'
$PrivateDir = Join-Path $RepoPath 'private'
$DataPath = Join-Path $PrivateDir 'pfr-private.json'
$LauncherPath = Join-Path $PrivateRoot 'Start-Melbourne-Cup-Hub-Private.ps1'
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Melbourne Cup Hub Private.lnk'

New-Item -ItemType Directory -Force -Path $PrivateRoot | Out-Null

if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
    if (Test-Path $RepoPath) { Remove-Item $RepoPath -Recurse -Force }
    git clone $RepoUrl $RepoPath
} else {
    git -C $RepoPath fetch origin
    git -C $RepoPath reset --hard origin/main
}

New-Item -ItemType Directory -Force -Path $PrivateDir | Out-Null
if (-not (Test-Path $DataPath)) {
    $searchRoots = @((Join-Path $HOME 'Downloads'), (Join-Path $HOME 'Documents')) | Where-Object { Test-Path $_ }
    $candidate = Get-ChildItem $searchRoots -File -Filter '*.json' -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -ne $DataPath -and $_.Name -match 'timeform-private-projected24|timeform.*private|2026-09-15-timeform-private|pfr-private' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $candidate) {
        throw 'Private PFR JSON was not found automatically. Put the private JSON in Downloads and run this installer again.'
    }
    Copy-Item $candidate.FullName $DataPath -Force
}

$launcher = @'
$ErrorActionPreference = 'Stop'
$root = Join-Path $HOME 'Documents\MelbourneCupHubPrivate'
$repo = Join-Path $root 'melbourne-cup-hub'
$data = Join-Path $repo 'private\pfr-private.json'
if (-not (Test-Path $data)) { throw "Private PFR data missing: $data" }

# Keep the local software shell current while preserving the untracked private/ dataset.
git -C $repo fetch origin | Out-Null
git -C $repo reset --hard origin/main | Out-Null

$existing = Get-NetTCPConnection -LocalPort 8765 -State Listen -ErrorAction SilentlyContinue
if (-not $existing) {
    Start-Process -WindowStyle Hidden -FilePath 'python' -ArgumentList @('-m','http.server','8765','--bind','127.0.0.1','--directory',$repo)
    Start-Sleep -Milliseconds 900
}
Start-Process 'http://127.0.0.1:8765/'
'@
Set-Content -Path $LauncherPath -Value $launcher -Encoding UTF8

$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($DesktopShortcut)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`""
$shortcut.WorkingDirectory = $PrivateRoot
$shortcut.Description = 'Open the local Melbourne Cup Hub with private PFR ratings'
$shortcut.Save()

Write-Host ''
Write-Host 'PRIVATE PFR SETUP COMPLETE' -ForegroundColor Green
Write-Host "Local repo: $RepoPath"
Write-Host "Private data: $DataPath"
Write-Host "Desktop shortcut: $DesktopShortcut"
Write-Host 'The shortcut now updates the Hub and opens the fully local private workspace.'
& $LauncherPath
