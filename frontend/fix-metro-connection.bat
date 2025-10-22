@echo off
echo.
echo ================================================================
echo   Fix React Native Metro Connection Issue
echo ================================================================
echo.

REM Kill any Metro/node processes
echo Step 1: Killing any running Metro/Node processes...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL%==0 (
    echo    - Killed existing Node processes
) else (
    echo    - No Node processes to kill
)

echo.
echo Step 2: Cleaning Metro bundler cache...
cd ..\frontend
call npx react-native start --reset-cache >nul 2>&1 &
timeout /t 2 >nul
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Step 3: Setting up ADB port forwarding...
adb reverse tcp:8081 tcp:8081
if %ERRORLEVEL%==0 (
    echo    - Port forwarding configured: Device 8081 -^> PC 8081
) else (
    echo    - Warning: ADB reverse failed. Make sure device is connected.
)

adb reverse tcp:3000 tcp:3000
if %ERRORLEVEL%==0 (
    echo    - Port forwarding configured: Device 3000 -^> PC 3000
) else (
    echo    - Warning: ADB reverse failed for port 3000
)

echo.
echo Step 4: Checking connected devices...
adb devices
echo.

echo Step 5: Cleaning build folders...
cd android
if exist ".\app\build" (
    echo    - Cleaning Android build folder...
    rmdir /s /q .\app\build
)
cd ..

echo.
echo ================================================================
echo   Setup Complete!
echo ================================================================
echo.
echo Next steps:
echo.
echo Terminal 1 - Start Metro:
echo    cd frontend
echo    npm start
echo.
echo Terminal 2 - Run Android (after Metro is ready):
echo    cd frontend
echo    npm run android
echo.
echo Or press 'a' in Metro terminal to launch Android
echo.
pause
