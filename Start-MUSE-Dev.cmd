@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-MUSE-Dev.ps1"
if errorlevel 1 pause
