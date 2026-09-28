@echo off
title Hapus Auto-Start Server Arz-WEB
chcp 65001 > nul
cls

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_VBS=%STARTUP_FOLDER%\ArzWebDaemon.vbs"

if exist "%TARGET_VBS%" (
    del /f /q "%TARGET_VBS%"
    echo [SUKSES] Auto-Start Arz-WEB berhasil dicopot dari folder Startup Windows.
) else (
    echo [INFO] Auto-Start belum terpasang di folder Startup.
)

echo.
pause
