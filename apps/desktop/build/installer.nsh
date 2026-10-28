!macro customInit
  ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ReadRegStr $1 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  !insertmacro GetDParameter $2
  ; Preserve existing installs and an explicit /D directory during updates.
  ${If} $0 == ""
  ${AndIf} $1 == ""
  ${AndIf} $2 == ""
    StrCpy $INSTDIR "E:\MUSE"
  ${EndIf}
!macroend
