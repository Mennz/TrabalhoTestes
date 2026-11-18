@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Microsoft\dotnet;%PATH%"
set SELENIUM_PAUSA_MS=1200
echo === Testes funcionais com Selenium (CT11 a CT20) - o Chrome vai abrir ===
dotnet test Testes.Selenium --logger "console;verbosity=normal"
pause
