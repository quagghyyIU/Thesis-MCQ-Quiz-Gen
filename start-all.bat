@echo off
chcp 65001 >nul
title QuizGen - Start All Services

echo ===========================================
echo      QuizGen - Starting All Services
echo ===========================================
echo.

REM Kill existing processes on ports 8000 and 3000
echo [1/4] Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F 2>nul
timeout /t 1 /nobreak >nul

REM Check Python and dependencies
echo [2/4] Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python first.
    pause
    exit /b 1
)

REM Check Node.js
echo [3/4] Checking Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo.
echo [4/4] Starting services...
echo.

REM Start Backend in new window
echo  → Starting Backend (FastAPI) on http://localhost:8000
cd /d "%~dp0backend"
start "QuizGen Backend" cmd /k "python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

REM Start Frontend in new window
echo  → Starting Frontend (Next.js) on http://localhost:3000
cd /d "%~dp0frontend"
start "QuizGen Frontend" cmd /k "npm run dev"

echo.
echo ===========================================
echo      All services started!
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo ===========================================
echo.

REM Wait a bit then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo Press any key to stop all services...
pause >nul

REM Cleanup
echo.
echo Stopping services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do taskkill /PID %%a /F 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F 2>nul
echo Done!
timeout /t 2 /nobreak >nul
