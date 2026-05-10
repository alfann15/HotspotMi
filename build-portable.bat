@echo off
echo ==================================================
echo   MEMBUAT VERSI PORTABLE HOTSPOTMI
echo ==================================================
echo.

echo 1. Menjalankan proses Build...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build gagal! Cek pesan error di atas.
    pause
    exit /b 1
)

echo.
echo 2. Menyiapkan folder Portable...
set PORTABLE_DIR=HotspotMi-Portable

if exist "%PORTABLE_DIR%" (
    rmdir /s /q "%PORTABLE_DIR%"
)
mkdir "%PORTABLE_DIR%"

echo 3. Mengkopi file sistem inti...
xcopy /E /I /Y ".next\standalone\*" "%PORTABLE_DIR%\" >nul

echo 4. Mengkopi file statis (CSS/JS/Font)...
if not exist "%PORTABLE_DIR%\.next\static" mkdir "%PORTABLE_DIR%\.next\static"
xcopy /E /I /Y ".next\static\*" "%PORTABLE_DIR%\.next\static\" >nul

echo 5. Mengkopi file publik...
if exist "public" (
    if not exist "%PORTABLE_DIR%\public" mkdir "%PORTABLE_DIR%\public"
    xcopy /E /I /Y "public\*" "%PORTABLE_DIR%\public\" >nul
)

echo 6. Mendeteksi nama alias modul Turbopack (node-routeros-hash)...
for /f "delims=" %%i in ('powershell -NoProfile -Command "$chunks = Get-ChildItem '.next\standalone\.next\server\chunks' -Filter '*.js' -Recurse -ErrorAction SilentlyContinue; foreach ($f in $chunks) { try { $c = [System.IO.File]::ReadAllText($f.FullName); if ($c -match 'node-routeros-([a-f0-9]{16})') { Write-Output $Matches[0]; break } } catch {} }"') do set HASH_MODULE=%%i

if defined HASH_MODULE (
    echo    Ditemukan alias: %HASH_MODULE%
    echo    Mengkopi node-routeros sebagai %HASH_MODULE%...
    if not exist "%PORTABLE_DIR%\node_modules\%HASH_MODULE%" mkdir "%PORTABLE_DIR%\node_modules\%HASH_MODULE%"
    xcopy /E /I /Y "node_modules\node-routeros\*" "%PORTABLE_DIR%\node_modules\%HASH_MODULE%\" >nul
) else (
    echo    Tidak ada alias hash ditemukan (node-routeros sudah di-bundle langsung)
)

echo 7. Mengkopi node-routeros asli (untuk kompatibilitas)...
if not exist "%PORTABLE_DIR%\node_modules\node-routeros" mkdir "%PORTABLE_DIR%\node_modules\node-routeros"
xcopy /E /I /Y "node_modules\node-routeros\*" "%PORTABLE_DIR%\node_modules\node-routeros\" >nul

echo 8. Mengkopi .env.local (konfigurasi)...
if exist ".env.local" (
    copy /Y ".env.local" "%PORTABLE_DIR%\.env.local" >nul
    echo    .env.local disalin.
) else (
    echo    Tidak ada .env.local ditemukan, skip.
)

echo 9. Membuat file start.bat...
(
echo @echo off
echo title HotspotMi Server
echo set PORT=3000
echo echo.
echo echo ===================================
echo echo   HotspotMi - MikroTik Manager
echo echo   Akses: http://localhost:3000
echo echo   Tekan Ctrl+C untuk mematikan
echo echo ===================================
echo echo.
echo node server.js
) > "%PORTABLE_DIR%\start.bat"

echo.
echo ==================================================
echo   SELESAI!
echo ==================================================
echo.
echo Folder "%PORTABLE_DIR%" berhasil dibuat di:
echo %CD%\%PORTABLE_DIR%
echo.
echo Cara deploy ke PC lain:
echo  1. Pindahkan folder "%PORTABLE_DIR%" ke PC tujuan (via Flashdisk/LAN)
echo  2. Pastikan PC tujuan sudah install Node.js
echo  3. Klik ganda "start.bat" di dalam folder tersebut
echo  4. Buka browser: http://localhost:3000
echo.
pause
