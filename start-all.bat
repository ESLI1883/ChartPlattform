@echo off

REM Server in neuem Fenster starten
echo 🟢 Starte Server...
start "Server" cmd /k "cd server && node index.js"

REM Client in neuem Fenster starten
echo 🟡 Starte Client...
start "Client" cmd /k "cd client && npm start"

exit
