# Build all four Vahan360 production images locally.
# Usage: .\deploy\scripts\docker-build-all.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\package.json")) {
  $root = (Get-Location).Path
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not running. Start Docker Desktop first."
  exit 1
}

$apiUrl = $env:NEXT_PUBLIC_API_URL
if (-not $apiUrl) { $apiUrl = "http://localhost:3001/api" }

Write-Host "Building web (NEXT_PUBLIC_API_URL=$apiUrl)..."
docker build -f "$root\apps\web\Dockerfile" --build-arg "NEXT_PUBLIC_API_URL=$apiUrl" -t vahan360-web:latest $root

Write-Host "Building api-express..."
docker build -f "$root\apps\api-express\Dockerfile" -t vahan360-api-express:latest $root

Write-Host "Building worker..."
docker build -f "$root\apps\worker\Dockerfile" -t vahan360-worker:latest $root

Write-Host "Building api-nest..."
docker build -f "$root\apps\api-nest\Dockerfile" -t vahan360-api-nest:latest $root

Write-Host ""
Write-Host "All 4 images built:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | Select-String "vahan360"
