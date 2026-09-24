# Starts the Orbit backend, waits for it to be listening, then starts the
# Electron app. This is the script Windows Startup should point at — see
# autostart_windows.ps1, which wires that up.
#
# Assumes this repo layout:
#   orbit/            <- the frontend project (npm run build has been run,
#                         or npm run dev for a dev-mode autostart)
#   orbit-backend/    <- this backend project, with .venv already created
#                         (python -m venv .venv; .venv\Scripts\pip install -r requirements.txt)
#
# Edit the two paths below to match where you actually cloned each one.

$BackendDir = "$env:USERPROFILE\orbit-backend"
$FrontendDir = "$env:USERPROFILE\orbit"

$ErrorActionPreference = "Stop"

Write-Host "Starting Orbit backend..."
Start-Process -WindowStyle Hidden -FilePath "$BackendDir\.venv\Scripts\python.exe" `
    -ArgumentList "-m", "app.server" -WorkingDirectory $BackendDir

# Give the WebSocket server a moment to bind before Electron tries to reach it.
Start-Sleep -Seconds 3

Write-Host "Starting Orbit..."
Set-Location $FrontendDir

# Prefer a packaged build if one exists; fall back to dev mode otherwise.
$packaged = Get-ChildItem -Path "$FrontendDir\dist_electron" -Filter "*.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
if ($packaged) {
    Start-Process -FilePath $packaged.FullName
} else {
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir
}
