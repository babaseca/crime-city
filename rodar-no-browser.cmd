@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rodar-no-browser.ps1"
if errorlevel 1 pause
