@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
echo ============================================
echo Imprezja Quiz - Pelne usuniecie starej instalacji
echo ============================================
echo.
echo URUCHOM JAK ADMINISTRATOR (PPM - Uruchom jako administrator)
echo.
echo Zamykam aplikacje...
taskkill /F /IM ImprezjaQuiz.exe >nul 2>&1
taskkill /F /IM IMPREZJA.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo.
pause

REM === 1. Scierzka z rejestru (gdzie naprawde jest zainstalowane) ===
echo Sprawdzam rejestr...
for /f "skip=2 tokens=2*" %%a in ('reg query "HKCU\Software\pl.imprezja.votebattle" /v "InstallLocation" 2^>nul') do (
    set "REG_PATH=%%b"
    if defined REG_PATH (
        echo Znaleziono w rejestrze: !REG_PATH!
        if exist "!REG_PATH!" (
            echo Usuwam: !REG_PATH!
            rmdir /s /q "!REG_PATH!" 2>nul
            timeout /t 1 /nobreak >nul
            if exist "!REG_PATH!" rmdir /s /q "!REG_PATH!"
            if not exist "!REG_PATH!" echo Usunieto.
        )
    )
)

REM === 2. Standardowe sciezki instalacji (w tym stare/uszkodzone: IMPREZJA.exe) ===
set "PATHS[0]=%LOCALAPPDATA%\Programs\Imprezja Quiz"
set "PATHS[1]=%LOCALAPPDATA%\Programs\IMPREZJA"
set "PATHS[2]=%LOCALAPPDATA%\Programs\IMPREZJA.exe"
set "PATHS[3]=%LOCALAPPDATA%\Programs\votebattle"
set "PATHS[4]=%ProgramFiles%\Imprezja Quiz"
set "PATHS[5]=%ProgramFiles(x86)%\Imprezja Quiz"

for /L %%i in (0,1,5) do (
    set "p=!PATHS[%%i]!"
    if exist "!p!" (
        echo Usuwam: !p!
        rmdir /s /q "!p!" 2>nul
        if exist "!p!" (
            timeout /t 2 /nobreak >nul
            rmdir /s /q "!p!"
        )
        if exist "!p!" (
            rem IMPREZJA.exe moze byc plikiem (uszkodzona dawna instalacja)
            del /f "!p!" 2>nul
        )
        if exist "!p!" (echo UWAGA: Nie usunieto - uruchom jako Administrator) else (echo Usunieto.)
    )
)

REM === 3. AppData (dane) ===
for %%p in ("%APPDATA%\Imprezja Quiz" "%APPDATA%\IMPREZJA" "%APPDATA%\votebattle") do (
    if exist %%p (
        echo Usuwam dane: %%p
        rmdir /s /q %%p
        echo Usunieto.
    )
)

REM === 4. Skrotki ===
if exist "%USERPROFILE%\Desktop\Imprezja Quiz.lnk" del /f "%USERPROFILE%\Desktop\Imprezja Quiz.lnk" && echo Usunieto skrot z pulpitu.
if exist "%USERPROFILE%\Desktop\IMPREZJA.lnk" del /f "%USERPROFILE%\Desktop\IMPREZJA.lnk" && echo Usunieto skrot z pulpitu.
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Imprezja Quiz.lnk" del /f "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Imprezja Quiz.lnk" && echo Usunieto skrot z menu Start.
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\IMPREZJA.lnk" del /f "%APPDATA%\Microsoft\Windows\Start Menu\Programs\IMPREZJA.lnk" && echo Usunieto skrot z menu Start.

REM === 5. Rejestr - InstallLocation (GUID) i Uninstall ===
reg delete "HKCU\Software\pl.imprezja.votebattle" /f >nul 2>&1
reg delete "HKCU\Software\f0431703-729b-5c88-965f-47623c9e4887" /f >nul 2>&1
powershell -NoProfile -Command "Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -EA 0 | ForEach-Object { $p=Get-ItemProperty $_.PSPath -EA 0; if($p.DisplayName -match 'Imprezja|IMPREZJA') { $loc=$p.InstallLocation; if($loc -and (Test-Path $loc)) { Remove-Item $loc -Recurse -Force -EA 0; Write-Host 'Usunieto folder:' $loc }; Remove-Item $_.PSPath -Recurse -Force; Write-Host 'Usunieto wpis rejestru' } }" 2>nul

echo.
echo Zakonczono. Mozesz teraz uruchomic instalator.
echo.
pause
