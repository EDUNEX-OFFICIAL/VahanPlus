# Free disk space: remove VahanPlus test images, unused Docker data, and local build caches.
# Run in PowerShell after Docker Desktop is running.
# Usage: .\deploy\scripts\docker-cleanup.ps1

$ErrorActionPreference = "Continue"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$root\package.json")) {
  $root = (Get-Location).Path
}

Write-Host "=== Docker cleanup ==="
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not running. Start Docker Desktop, then run this script again."
  exit 1
}

docker ps -aq 2>$null | ForEach-Object { docker stop $_ 2>$null | Out-Null }
docker container prune -f
docker images --format "{{.Repository}}:{{.Tag}}" | Select-String "vahanplus" | ForEach-Object {
  docker rmi -f $_.Line.Trim() 2>$null
}
docker image prune -f
docker builder prune -af
Write-Host ""
docker system df

Write-Host ""
Write-Host "=== Local VahanPlus build cache (safe to delete) ==="
$paths = @(
  "$root\apps\web\.next",
  "$root\.turbo",
  "$root\packages\contracts\dist",
  "$root\packages\db\dist",
  "$root\packages\scraper-bihar-epass\dist",
  "$root\packages\scraper-core\dist",
  "$root\packages\browser-pool\dist",
  "$root\apps\api-nest\dist"
)
foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed $p"
  }
}

Write-Host ""
Write-Host "Done. Rebuild with: pnpm build"
Write-Host "Optional: remove ALL unused images (other projects too): docker image prune -a -f"
