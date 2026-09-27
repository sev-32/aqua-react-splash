#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
ROOT=Path(__file__).resolve().parents[1]/'dist'
os.chdir(ROOT)
print('Laser 2 Sailing Foundry V8: http://127.0.0.1:4173')
ThreadingHTTPServer(('127.0.0.1',4173),SimpleHTTPRequestHandler).serve_forever()
