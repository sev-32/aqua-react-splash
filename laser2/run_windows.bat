@echo off
cd /d %~dp0
call npm run build
start "" http://127.0.0.1:4173
python tools\serve.py
