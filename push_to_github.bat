@echo off
setlocal
title BLACKOUT - Push to GitHub
echo ========================================================
echo       BLACKOUT: Automatic GitHub Push Utility
echo ========================================================
echo.
echo Please enter your GitHub Repository URL.
echo Example: https://github.com/your-username/blackout-event-entry.git
echo.
set /p REPO_URL="Enter GitHub Repo URL: "

if "%REPO_URL%"=="" (
    echo [ERROR] No URL entered. Aborted.
    pause
    exit /b 1
)

echo.
echo [1/3] Setting remote origin to %REPO_URL%...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [2/3] Setting branch to main...
git branch -M main

echo [3/3] Pushing code to GitHub...
echo (If prompted, log in with your browser or GitHub Personal Access Token)
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Code pushed to GitHub successfully!
    echo  Now go to vercel.com to deploy it with 1 click!
    echo ========================================================
) else (
    echo.
    echo [ERROR] Push failed. Please verify repository permissions or URL.
)

pause
