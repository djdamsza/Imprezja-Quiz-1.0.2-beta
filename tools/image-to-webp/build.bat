@echo off
REM Budowanie wersji portable dla Windows
REM Wymaga: pip install pyinstaller pillow

cd /d "%~dp0"

echo Instalowanie zaleznosci...
pip install -q pyinstaller pillow

echo Budowanie (wersja jednoplikowa)...
python -m PyInstaller --noconfirm build-onefile.spec

echo.
echo Gotowe! Plik portable:
echo   dist\Konwerter-WebP.exe
echo.
echo Skopiuj ten JEDEN plik na pulpit, pendrive - dziala wszedzie.
echo Uruchom: dwukrotne klikniecie Konwerter-WebP.exe
pause
