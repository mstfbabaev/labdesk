@echo off
set ROOT=C:\Users\user\Desktop\LabDesk

wt new-tab --title "MinIO" cmd /k "%ROOT%\minio.exe server %ROOT%\minio-data --console-address :9001" ; split-pane --title "Backend" cmd /k "cd /d %ROOT%\backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload" ; split-pane --title "Bot" cmd /k "cd /d %ROOT%\backend && .venv\Scripts\python.exe bot.py" ; split-pane --title "Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev"
