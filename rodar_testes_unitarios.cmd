@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Microsoft\dotnet;%PATH%"
echo === Testes unitarios (CT01 a CT10) ===
dotnet test Testes.Unitarios --logger "console;verbosity=normal"
pause
