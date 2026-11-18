@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Microsoft\dotnet;%PATH%"
if exist TrabalhoPOO2\personagens.json del TrabalhoPOO2\personagens.json
cd TrabalhoPOO2
dotnet run
pause
