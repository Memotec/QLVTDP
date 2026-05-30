@echo off
title CNS/ATM INVENTORY - GOI CHAY OFFLINE SIEU TOC
color 0A
cls

echo ======================================================================
2: echo             PHAN MEM QUAN LY ^& KIEM KE VAT TU CNS/ATM
echo                        DOI THONG TIN LIEN LAC
echo ======================================================================
echo.
echo CHON CHE DO KHOI CHAY PHAN MEM:
echo ----------------------------------------------------------------------
echo [1] CHAY BAN DONG GOI SAN (KHUYEN DUNG - SIEU TOC)
echo     Chay ngay tu file build san, khong can internet, khong can tai thu vien!
echo     Tiet kiem o dia va tranh moi xung dot loi npm.
echo.
echo [2] CAI DAT ^& CHAY CHED DE PHA TRIEN (DEV MODE)
echo     Su dung luc muon sua code, hoac can cap nhat nang cap ban moi tu dau.
echo ----------------------------------------------------------------------
echo.

set /p mode_choice="Nhap lua chon cua ban (1 hoac 2): "

if "%mode_choice%"=="2" goto dev_mode

:prod_mode
cls
echo ======================================================================
echo       KHOI CHAY KHO VAT TU CNS/ATM BANG BAN DONG GOI SAN OFFLINE
echo ======================================================================
echo.
echo [+] Dang quet va tim dia chi IP mang LAN cua may ban...

set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| find "IPv4"') do (
    set LOCAL_IP=%%i
)

echo.
echo ======================================================================
echo   HE THONG DUOC LOP BE BAN LAN TRONG DOI THONG TIN:
echo.
echo   * TRUY CAP TU MAY CHU NAY:  http://localhost:3000
echo   * TRUY CAP TU MAY KHAC/QL:  http:%LOCAL_IP%:3000
echo ======================================================================
echo.
echo [+] Dang khoi dong Web Server sieu toc bang Node.js...
node server_offline.js
pause
exit /b

:dev_mode
cls
echo ======================================================================
echo           KHOI CHAY CHE DO PHAT TRIEN (YEU CAU CAI THE THU VIEN)
echo ======================================================================
echo.
set CURRENT_DIR=%~dp0
set LOCAL_CACHE_DIR=%CURRENT_DIR%.npm-cache

echo [+] Vi tri thu muc: %CURRENT_DIR%
echo [+] Duong dan npm cache: %LOCAL_CACHE_DIR%
echo.

echo [?] Ban co muon lam sach thu muc cu de tranh xung dot khong? (Y/N)
set /p clean_choice="Chon (Y/N): "
if /i "%clean_choice%"=="Y" (
    echo [+] Dang xoa node_modules cu...
    if exist "%CURRENT_DIR%node_modules" rd /s /q "%CURRENT_DIR%node_modules"
    if exist "%CURRENT_DIR%package-lock.json" del /q "%CURRENT_DIR%package-lock.json"
    echo [OK] Da xoa sach thu muc cu!
)

echo.
echo [+] Dang cai dat thu vien. Vui long cho giay lat...
call npm install --cache="%LOCAL_CACHE_DIR%" --prefer-offline --no-audit --no-fund

if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Cai dat khong thanh cong. Vui long ket noi internet de tai lan dau.
    pause
    exit /b
)

echo.
echo [OK] Nap thu vien hoan tat!
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| find "IPv4"') do (
    set LOCAL_IP=%%i
)

echo ======================================================================
echo   KHOI CHAY THANH CONG!
echo   Moi nguoi truy cap: http:%LOCAL_IP%:3000
echo ======================================================================
pause
call npm run dev -- --host 0.0.0.0 --port 3000
