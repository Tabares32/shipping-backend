#!/bin/bash
# Start with Uvicorn via Gunicorn (Render uses this)
exec gunicorn -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT --workers 1
