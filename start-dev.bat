@echo off
echo ========================================
echo WhatsApp Marketing - Development Setup
echo ========================================
echo.
echo This will:
echo 1. Start Metro Bundler
echo 2. Build and install the app
echo.
echo Press any key to continue...
pause > nul

echo.
echo Starting Metro Bundler in a new window...
start "Metro Bundler" cmd /k "cd /d C:\Users\bishn\Desktop\Coding\WhatsAppMarketing && npx react-native start"

echo Waiting 5 seconds for Metro to start...
timeout /t 5 /nobreak > nul

echo.
echo Building and installing the app...
cd /d C:\Users\bishn\Desktop\Coding\WhatsAppMarketing
npx react-native run-android

echo.
echo Done! Check your device for the app.
pause
