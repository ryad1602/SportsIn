# Lance le frontend dans une nouvelle fenetre PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

# Lance le backend dans ce terminal
Set-Location $PSScriptRoot
.\gradlew :app:bootRun
