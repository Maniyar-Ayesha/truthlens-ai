# =========================================================
# fix-pagefile.ps1 — Run as Administrator!
# Increases Windows virtual memory (paging file) to 12GB
# Required to build React Native apps with NDK on low-RAM systems
# =========================================================

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]"Administrator")) {
    Write-Host "ERROR: Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> 'Run as Administrator', then run this script." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " Windows Paging File Fix for Android Builds" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check current paging file
Write-Host "`nCurrent paging file settings:" -ForegroundColor Yellow
$current = Get-WmiObject -Class Win32_PageFileSetting -ErrorAction SilentlyContinue
if ($current) {
    $current | ForEach-Object { Write-Host "  $($_.Name): Initial=$($_.InitialSize)MB, Max=$($_.MaximumSize)MB" }
} else {
    Write-Host "  System-managed (automatic)" -ForegroundColor Gray
}

$ram = [math]::Round((Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
Write-Host "`nSystem RAM: ${ram}GB" -ForegroundColor Yellow

# Set paging file to manual with 8GB initial / 12GB max
Write-Host "`nSetting paging file: Initial=8192MB, Max=12288MB..." -ForegroundColor Green

try {
    # Disable automatic management
    $cs = Get-WmiObject -Class Win32_ComputerSystem
    $cs.AutomaticManagedPagefile = $false
    $cs.Put() | Out-Null

    # Remove existing paging file settings
    Get-WmiObject -Class Win32_PageFileSetting | Remove-WmiObject -ErrorAction SilentlyContinue

    # Set new paging file on C:
    $pf = [WmiClass]"Win32_PageFileSetting"
    $newPF = $pf.CreateInstance()
    $newPF.Name = "C:\pagefile.sys"
    $newPF.InitialSize = 8192
    $newPF.MaximumSize = 12288
    $newPF.Put() | Out-Null

    Write-Host "SUCCESS! Paging file set to 8192MB - 12288MB on C:" -ForegroundColor Green
    Write-Host "`nYou MUST restart your computer for this to take effect." -ForegroundColor Red
    Write-Host "After restart, run: npx expo run:android" -ForegroundColor Cyan
    
} catch {
    Write-Host "WMI method failed. Trying alternate method..." -ForegroundColor Yellow
    
    # Alternate: use wmic
    $result = & wmic pagefile set InitialSize=8192,MaximumSize=12288 2>&1
    Write-Host "wmic result: $result"
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " RESTART REQUIRED to apply paging file change" -ForegroundColor Red
Write-Host "================================================`n" -ForegroundColor Cyan

$restart = Read-Host "Restart now? (y/n)"
if ($restart -eq "y" -or $restart -eq "Y") {
    Restart-Computer -Force
}
