@echo off
chcp 65001 >nul
cd /d "%~dp0"
title EduCanvas - Bang trang lop hoc
where node >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Hay cai Node.js 20.19+ tai https://nodejs.org/
  pause
  exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [CAU HINH] Da tao .env. Hay mo file nay va dien URL + publishable key Supabase.
  echo Sau do chay supabase/schema.sql tren Supabase va chay lai file BAT nay.
  pause
  exit /b 0
)
if not exist "node_modules" (
  echo [CAI DAT] Dang cai npm packages...
  call npm install
  if errorlevel 1 (
    echo [LOI] npm install that bai. Kiem tra ket noi Internet.
    pause
    exit /b 1
  )
)
echo [WEB] Dang khoi dong http://localhost:5173
call npm run dev
pause
