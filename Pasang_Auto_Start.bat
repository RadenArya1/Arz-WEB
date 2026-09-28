@echo off
title Pasang Auto-Start Server Arz-WEB
chcp 65001 > nul
cls

echo ==========================================================
echo        PASANG AUTO-START SERVER LATAR BELAKANG
echo ==========================================================
echo   Server serve.js akan berjalan otomatis setiap kali
echo   laptop/komputer Anda dinyalakan (tanpa jendela CMD).
echo ==========================================================
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_VBS=%STARTUP_FOLDER%\ArzWebDaemon.vbs"
set "PROJECT_DIR=%~dp0"

echo Membuat script startup senyap di:
echo "%TARGET_VBS%"
echo.

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "cmd.exe /d /c cd /d """ ^& "%~dp0" ^& """ ^&^& node serve-watchdog.js", 0, False
) > "%TARGET_VBS%"

if exist "%TARGET_VBS%" (
    echo [SUKSES] Auto-Start Self-Healing Watchdog berhasil dipasang!
    echo.
    echo Sekarang serve-watchdog.js akan selalu aktif di latar belakang saat Windows menyala,
    echo otomatis merestart server jika terjadi crash atau hambatan.
    echo Anda bisa langsung membuka website kapan saja tanpa perlu menyalakan server manual.

    echo.
    echo Menjalankan server untuk pertama kali sekarang...
    wscript "%TARGET_VBS%"
    echo Server telah aktif di http://127.0.0.1:8080/
) else (
    echo [GAGAL] Tidak dapat menulis ke folder Startup.
)

echo.
pause
