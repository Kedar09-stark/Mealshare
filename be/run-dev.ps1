<#
Run backend ASGI server for development with uvicorn.
Usage: Open PowerShell in `be` and run `.
un-dev.ps1`.
This script will activate `venv` if present and start uvicorn.
#>

Set-StrictMode -Version Latest

if (Test-Path .\venv\Scripts\Activate.ps1) {
    Write-Host "Activating virtualenv..."
    . .\venv\Scripts\Activate.ps1
} else {
    Write-Host "No virtualenv activation script found at .\venv\Scripts\Activate.ps1 - continuing with current environment"
}

Write-Host "Starting uvicorn mealshare.asgi:application on 127.0.0.1:8000"
uvicorn mealshare.asgi:application --host 127.0.0.1 --port 8000 --reload
