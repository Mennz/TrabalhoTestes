@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PATH=%LOCALAPPDATA%\Microsoft\dotnet;%PATH%"
dotnet build Testes.Manuais -v q
for %%c in (CT21 CT22 CT23 CT24 CT25 CT26 CT27 CT28 CT29 CT30) do dotnet Testes.Manuais\bin\Debug\net8.0\Testes.Manuais.dll %%c evidencias\manuais\%%c.txt
echo Prints salvos em evidencias\manuais
pause
