@echo off
title CNS/ATM INVENTORY - HE THONG KHO OFFLINE
color 0B
cls

echo ======================================================================
echo             PHAN MEM QUAN LY & KIEM KE VAT TU CNS/ATM
echo                        DOI THONG TIN LIEN LAC
echo ======================================================================
echo.
echo [+] Dang chuan bi moi truong offline tren o dia D...

:: Lay duong dan hien tai cua o dia
set CURRENT_DIR=%~dp0
set LOCAL_CACHE_DIR=%CURRENT_DIR%.npm-cache

echo [+] Vi tri thu muc: %CURRENT_DIR%
echo [+] Su dung loi giai cache o dia phu: %LOCAL_CACHE_DIR%
echo.

:: Truong hop nguoi dung muon xoa sach de cai lai tu dau
echo [?] Ban co muon lam sach thu muc cai dat cu de tranh xung dot khong? 
echo     (Khuyen cao chon Y neu truoc do bi loi "Cannot find module")
set /p clean_choice="Chon (Y/N): "
if /i "%clean_choice%"=="Y" (
    echo [+] Dang xoa node_modules va package-lock.json cu...
    if exist "%CURRENT_DIR%node_modules" rd /s /q "%CURRENT_DIR%node_modules"
    if exist "%CURRENT_DIR%package-lock.json" del /q "%CURRENT_DIR%package-lock.json"
    echo [OK] Da xoa sach thu muc cu thành cong!
    echo.
)

:: Tien hanh cai dat voi cau hinh Cache chuyen vao thu muc .npm-cache tai o D
echo [+] Bat dau nap va dinh hinh thu vien. Vui long cho trong giay lat...
echo     (Tien trinh nay su dung cache o D nen khong lo day o dia C!)
echo.

call npm install --cache="%LOCAL_CACHE_DIR%" --prefer-offline --no-audit --no-fund

if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Co loi xay ra trong qua trinh nap tai thong tin.
    echo       Hay dam bao may tinh cua ban dang cam day mang hoac co internet luc nay de tai thu vien lan dau.
    pause
    exit /b
)

echo.
echo [OK] Nap thu vien thanh cong!
echo [+] Dang tim dia chi IP cuc bo cua may ban...
echo.

for /f "tokens=2 delims=:" %%i in ('ipconfig ^| find "IPv4"') do (
    set LOCAL_IP=%%i
)

echo ======================================================================
echo                KHOI CHAY KHO VAT TU OFFLINE THANH CONG!
echo ======================================================================
echo.
echo  * TRUY CAP TAI CHO (May chu): http://localhost:3000
echo.
echo  * TRUY CAP TU THIET BI KHAC (Mạng LAN):
echo    Dia chi dinh tuyen: http:%LOCAL_IP%:3000
echo.
echo ======================================================================
echo Nhan phim bat ky de start server hoat dong...
pause > null

call npm run dev -- --host 0.0.0.0 --port 3000
