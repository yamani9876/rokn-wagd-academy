@echo off
cd /d "%~dp0"
set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe" set "NODE=%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe"
if not defined NODE (
  echo Install Node.js from https://nodejs.org and run this file again.
  pause
  exit /b 1
)
"%NODE%" "%~dp0server.js"
echo.
echo The academy server stopped.
pause
