; Imprezja Quiz – skrypt NSIS
; preInit: zabij aplikację + wyczyść zły InstallLocation z rejestru (IMPREZJA.exe)
; customInit: napraw INSTDIR jeśli wskazuje na uszkodzoną ścieżkę
; customCheckAppRunning pusty – pomija fałszywe wykrywanie

!ifndef BUILD_UNINSTALLER
  !include "StrContains.nsh"
!endif

; Klucz rejestru (GUID z appId pl.imprezja.votebattle)
!define IMPREZJA_INSTALL_KEY "Software\f0431703-729b-5c88-965f-47623c9e4887"

!macro preInit
  ; Usuń zły InstallLocation z rejestru (ścieżka IMPREZJA.exe z dawnych wersji)
  DeleteRegValue HKCU "${IMPREZJA_INSTALL_KEY}" "InstallLocation"
  ; Zabij procesy przed instalacją – zapobiega fałszywemu „zamknij aplikację” przy kopiowaniu plików
  nsExec::ExecToLog 'taskkill /F /IM ImprezjaQuiz.exe'
  Pop $0
  nsExec::ExecToLog 'taskkill /F /IM IMPREZJA.exe'
  Pop $0
  Sleep 500
!macroend

!macro customCheckAppRunning
!macroend

; Napraw INSTDIR gdy rejestr wskazuje na uszkodzoną ścieżkę (np. ...\IMPREZJA.exe)
!macro customInit
  ; Gdy INSTDIR zawiera "\IMPREZJA.exe" – to folder z błędnej starej instalacji
  ${StrContains} $0 "IMPREZJA.exe" $INSTDIR
  StrCmp $0 "" skipFix 0
    ; Użyj poprawnej ścieżki domyślnej
    StrCpy $INSTDIR "$LocalAppData\Programs\${APP_FILENAME}"
    DetailPrint "Ustawiono katalog instalacji: $INSTDIR"
  skipFix:
!macroend

!macro customInstall
  CreateDirectory "$APPDATA\Imprezja Quiz\quizzes"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads\sfx"
!macroend

!macro customUnInit
  nsExec::ExecToLog 'taskkill /F /IM ImprezjaQuiz.exe'
  nsExec::ExecToLog 'taskkill /F /IM IMPREZJA.exe'
  Pop $0
  Sleep 500
!macroend
