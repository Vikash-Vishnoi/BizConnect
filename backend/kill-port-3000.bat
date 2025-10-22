@echo off
echo.
echo ================================================
echo   Killing Process on Port 3000
echo ================================================
echo.

REM Find process using port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    set PID=%%a
    goto :found
)

:notfound
echo Port 3000 is not in use.
echo Backend should start without issues.
goto :end

:found
echo Found process using port 3000: PID %PID%
echo.
set /p confirm="Kill this process? (y/n): "

if /i "%confirm%"=="y" (
    taskkill /PID %PID% /F
    if %ERRORLEVEL%==0 (
        echo.
        echo Process killed successfully!
        echo Port 3000 is now free.
    ) else (
        echo.
        echo Failed to kill process.
        echo Try running as Administrator.
    )
) else (
    echo.
    echo Process not killed.
    echo Backend may fail to start on port 3000.
)

:end
echo.
echo ================================================
echo.
pause
