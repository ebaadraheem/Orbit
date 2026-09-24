# Makes Orbit start automatically when you log into Windows, by placing a
# shortcut to start_orbit.ps1 in the current user's Startup folder — the
# same mechanism the frontend's "Start Orbit with Windows" setting
# describes (see src/components/settings/Settings.tsx). This script is
# what actually implements that switch; the toggle in the UI is currently
# cosmetic until you wire it to call this (or its uninstall counterpart).
#
# Run once, from an ordinary (non-admin) PowerShell prompt:
#   powershell -ExecutionPolicy Bypass -File scripts\autostart_windows.ps1
#
# To undo: delete "Orbit.lnk" from the Startup folder it prints below, or
# run this script again with -Remove.

param([switch]$Remove)

$StartupDir = [Environment]::GetFolderPath("Startup")
$ShortcutPath = Join-Path $StartupDir "Orbit.lnk"

if ($Remove) {
    if (Test-Path $ShortcutPath) {
        Remove-Item $ShortcutPath
        Write-Host "Removed $ShortcutPath — Orbit will no longer start automatically."
    } else {
        Write-Host "No autostart shortcut found."
    }
    exit
}

$ScriptPath = Join-Path $PSScriptRoot "start_orbit.ps1"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "Start Orbit"
$Shortcut.Save()

Write-Host "Created $ShortcutPath"
Write-Host "Orbit will start the next time you log in."
Write-Host "To turn this off later: powershell -File scripts\autostart_windows.ps1 -Remove"
