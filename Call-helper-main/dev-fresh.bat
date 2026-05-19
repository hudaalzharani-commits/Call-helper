@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Stopping old Node dev servers on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo Starting frontend on http://localhost:3000
call npm run dev
