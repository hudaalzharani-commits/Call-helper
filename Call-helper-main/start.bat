@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"
cls

echo.
echo =============================================
echo   Rafeeq Call Helper - Windows Start
echo =============================================
echo.

REM --- Check Node.js is installed ---
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is NOT installed.
  echo.
  echo Please install Node.js first:
  echo   https://nodejs.org/
  echo.
  echo Download the LTS version, run the installer,
  echo then RESTART your computer and run this script again.
  echo.
  pause
  exit /b 1
)
for /f "tokens=*" %%V in ('node -v') do echo [OK] Node.js %%V found

REM --- Check MongoDB is installed ---
where mongod >nul 2>&1
if %errorlevel% neq 0 (
  sc query "MongoDB" >nul 2>&1
  if !errorlevel! neq 0 (
    echo [ERROR] MongoDB is NOT installed.
    echo.
    echo Please install MongoDB Community Server:
    echo   https://www.mongodb.com/try/download/community
    echo.
    echo During installation:
    echo   - Choose "Complete" setup
    echo   - CHECK "Install MongoDB as a Service"
    echo   - CHECK "Install MongoDB Compass" if you want a GUI
    echo.
    echo Then RESTART your computer and run this script again.
    echo.
    pause
    exit /b 1
  )
)
echo [OK] MongoDB found

REM --- Try to start MongoDB Windows service ---
call :startMongoService "MongoDB"
call :startMongoService "MongoDB Server"
call :startMongoService "MongoDBServer"

REM --- Ensure backend .env exists ---
if not exist "backend\.env" (
  if exist "backend\.env.example" (
    echo [INFO] Creating backend\.env from example
    copy /Y "backend\.env.example" "backend\.env" >nul
  ) else (
    echo [INFO] Creating default backend\.env
    > "backend\.env" echo PORT=5000
    >>"backend\.env" echo NODE_ENV=development
    >>"backend\.env" echo FRONTEND_URL=http://localhost:3000
    >>"backend\.env" echo MONGODB_URI=mongodb://localhost:27017/rafeeq_db
    >>"backend\.env" echo JWT_SECRET=rafeeq-dev-secret
    >>"backend\.env" echo JWT_EXPIRE=7d
  )
)

REM --- Ensure frontend .env exists ---
if not exist ".env" (
  echo [INFO] Creating .env with VITE_ENABLE_AI=false
  > ".env" echo VITE_ENABLE_AI=false
)

REM --- Install dependencies ---
if not exist "node_modules" (
  echo [INFO] Installing frontend dependencies - please wait
  call npm install
  if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
  )
)

if not exist "backend\node_modules" (
  echo [INFO] Installing backend dependencies - please wait
  pushd backend
  call npm install
  popd
  if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
  )
)

REM --- Seed database once ---
if not exist "backend\.seeded" (
  echo [INFO] Seeding database - first run only
  pushd backend
  call npm run seed
  popd
  if errorlevel 1 (
    echo [ERROR] Seeding failed. Make sure MongoDB is running.
    pause
    exit /b 1
  )
  echo seeded>"backend\.seeded"
)

REM --- Start backend + frontend in separate terminals ---
start "Rafeeq Backend" cmd /k "cd /d %cd%\backend && npm run dev"
start "Rafeeq Frontend" cmd /k "cd /d %cd% && npm run dev"

echo.
echo =============================================
echo   [DONE] Started backend and frontend
echo =============================================
echo.
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo   Login:
echo     admin / admin123
echo     user  / user123
echo.
echo =============================================
echo.
pause
exit /b 0

:startMongoService
set "SVC=%~1"
sc query "%SVC%" >nul 2>&1
if %errorlevel% neq 0 (
  goto :eof
)

for /f "tokens=3 delims=: " %%A in ('sc query "%SVC%" ^| findstr /i "STATE"') do set "STATE=%%A"
if /i "%STATE%"=="RUNNING" (
  echo [OK] MongoDB service "%SVC%" already running
  goto :eof
)

echo [INFO] Starting MongoDB service "%SVC%"
net start "%SVC%" >nul 2>&1
if %errorlevel% neq 0 (
  echo [WARN] Could not start "%SVC%". Try running as Administrator.
) else (
  echo [OK] MongoDB service "%SVC%" started
)

goto :eof
