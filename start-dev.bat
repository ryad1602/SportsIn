@echo off
start "SportsIn Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
cd /d %~dp0
.\gradlew :app:bootRun
