; Imprezja Quiz – skrypt NSIS
; preInit: przy aktualizacji – zamknij aplikację i wyczyść rejestr (żeby instalator nie zawieszał się na zablokowanych plikach).
; customCheckAppRunning: pusty – pomija fałszywe wykrywanie.
; Uwaga: bez StrContains.nsh (generowało NSIS 6010 „not referenced” w one-click).

!define IMPREZJA_INSTALL_KEY "Software\f0431703-729b-5c88-965f-47623c9e4887"
!define IMPREZJA_UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\f0431703-729b-5c88-965f-47623c9e4887"

!macro preInit
  ; Tylko przy aktualizacji: wykryj poprzednią instalację, zamknij procesy i wyczyść rejestr.
  ReadRegStr $0 HKCU "${IMPREZJA_UNINSTALL_KEY}" "UninstallString"
  StrCmp $0 "" 0 do_cleanup
  ReadRegStr $0 HKCU "${IMPREZJA_INSTALL_KEY}" "InstallLocation"
  StrCmp $0 "" skip_cleanup do_cleanup
  do_cleanup:
    DeleteRegKey HKCU "${IMPREZJA_UNINSTALL_KEY}"
    DeleteRegKey HKCU "${IMPREZJA_INSTALL_KEY}"
    DeleteRegKey HKCU "Software\pl.imprezja.votebattle"
    DeleteRegValue HKCU "${IMPREZJA_INSTALL_KEY}" "InstallLocation"
    ; Zamknij aplikację – przez cmd z exit 0, żeby kod wyjścia był 0 (instalator nie pokazuje błędu).
    nsExec::Exec 'cmd /c taskkill /F /IM ImprezjaQuiz.exe & taskkill /F /IM IMPREZJA.exe & exit 0'
    Pop $0
    ClearErrors
    Sleep 500
  skip_cleanup:
!macroend

!macro customCheckAppRunning
!macroend

!macro customInit
  ClearErrors
!macroend

!macro customInstall
  CreateDirectory "$APPDATA\Imprezja Quiz\quizzes"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads"
  CreateDirectory "$APPDATA\Imprezja Quiz\uploads\sfx"
  ; Na Windows tunel LTE używa Tunnelmole (bez OpenSSH) – brak dodatkowych kroków instalacji.
!macroend

!macro customUnInit
  nsExec::Exec 'cmd /c taskkill /F /IM ImprezjaQuiz.exe & taskkill /F /IM IMPREZJA.exe & exit 0'
  Pop $0
  ClearErrors
  Sleep 500
!macroend
