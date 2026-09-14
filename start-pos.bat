@echo off
title POS Molliee - Tra Sua
echo ===================================================
echo   Dang khoi dong he thong POS Molliee...
echo ===================================================
cd /d "%~dp0"
start http://localhost:5174
npm run dev
pause
