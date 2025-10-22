@echo off
echo.
echo ========================================================
echo   WhatsApp Token Quick Fix
echo ========================================================
echo.
echo Your access token has expired!
echo.
echo Opening Meta Developer Dashboard...
echo.
start https://developers.facebook.com/apps/
echo.
echo Follow these steps:
echo   1. Select your WhatsApp app
echo   2. Go to: WhatsApp -^> API Setup
echo   3. Click "Generate Token"
echo   4. Copy the token
echo.
echo.
set /p token="Paste your new token here: "
echo.

if "%token%"=="" (
    echo Error: No token provided
    pause
    exit /b 1
)

echo.
echo Updating .env file...
echo.

REM Backup .env
copy .env .env.backup >nul 2>&1

REM Update token using PowerShell
powershell -Command "(Get-Content .env -Raw) -replace 'WHATSAPP_ACCESS_TOKEN=.*', 'WHATSAPP_ACCESS_TOKEN=%token%' | Set-Content .env -NoNewline"

echo Token updated successfully!
echo.
echo Validating token...
echo.
node validate-token.js
echo.
echo ========================================================
echo   Token Update Complete!
echo ========================================================
echo.
echo Next steps:
echo   1. Restart your backend: npm start
echo   2. Test API: node test-api.js
echo.
pause
