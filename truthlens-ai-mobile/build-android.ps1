# ============================================================
# build-android.ps1
# Run this script INSTEAD OF "npx expo run:android" directly.
# It injects the ninja-wrapper into PATH so that all ninja
# invocations during the build use -j1 (single job), preventing
# Windows paging file exhaustion on low-RAM (~6GB) systems.
# ============================================================

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$NinjaWrapperDir = Join-Path $ProjectRoot "android\ninja-wrapper"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " TruthLens Android Build (Low-RAM Mode)" -ForegroundColor Cyan
Write-Host " Ninja wrapper: $NinjaWrapperDir" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Inject ninja-wrapper at the FRONT of PATH so it shadows the real ninja.exe
$env:PATH = "$NinjaWrapperDir;$env:PATH"

Write-Host "[+] PATH updated -- ninja will run with -j1" -ForegroundColor Green
Write-Host "[+] Starting build... (this will be slow but stable)" -ForegroundColor Yellow
Write-Host ""

# Run the Expo build
npx expo run:android
