@echo off
title Arz-WEB • Grimoire Dashboard Server
chcp 65001 > nul
cls

echo ==========================================================
echo        ARZ-WEB • GRIMOIRE LOCAL SERVER LAUNCHER
echo ==========================================================
echo   Menjalankan server lokal (serve.js) dan membuka web...
echo ==========================================================
echo.

:: 1. Verifikasi Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak terdeteksi di komputer ini!
    echo Silakan unduh dan pasang Node.js dari: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Masuk ke direktori proyek
cd /d "%~dp0"

:: 3. Cek apakah port 8080 sudah berjalan
netstat -ano | findstr :8080 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Server lokal sudah aktif di port 8080!
    echo [*] Membuka browser ke http://127.0.0.1:8080/ ...
    start "" "http://127.0.0.1:8080/"
    echo.
    echo Website telah terbuka di browser. Tekan tombol apa saja untuk menutup jendela ini.
    pause >nul
    exit /b 0
)

:: 4. Jalankan serve.js
echo [*] Memulai server di http://127.0.0.1:8080/ ...
echo [*] Browser default akan terbuka secara otomatis.
echo.
echo [TIPS] Biarkan jendela ini tetap terbuka selama menggunakan website.
echo [TIPS] Tekan Ctrl + C untuk mematikan server.
echo.

node serve.js

pause
