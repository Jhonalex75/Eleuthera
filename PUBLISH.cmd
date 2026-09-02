@echo off
REM ---------------------------------------------------------------------------
REM  Publish the Eleuthera QA/QC dashboard.  Double-click this file.
REM
REM  Why a .cmd and not "npm run setup": on this machine npm cannot spawn
REM  powershell.exe - the child dies with ACCESS_DENIED (0xC0000022) and prints
REM  nothing at all, which looks like the command did nothing. Launched this way
REM  it runs normally.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

echo.
echo   Eleuthera Solar Field QA/QC - publish
echo   =====================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\setup.ps1"
set RC=%ERRORLEVEL%

echo.
if not "%RC%"=="0" (
  echo   Finished with errors ^(code %RC%^). Read the messages above.
) else (
  echo   Finished successfully.
)
echo.
echo   Press any key to close this window.
pause >nul
endlocal
