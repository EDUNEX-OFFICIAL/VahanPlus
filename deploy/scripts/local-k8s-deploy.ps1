# Deploy Vahan360 to Docker Desktop Kubernetes.
# Usage: .\deploy\scripts\local-k8s-deploy.ps1
#
# If pods show ImagePullBackOff with kind: switch Docker Desktop Kubernetes to **Kubeadm**
# (reset cluster) — Kubeadm shares images with `docker build` automatically.

$ErrorActionPreference = "Stop"
$root = "D:\AK47\Officials\Development\Projects\Iqbal Bhaijan\Vahan360"
Set-Location $root

function Ensure-K8sRunning {
  $st = docker desktop kubernetes status 2>&1 | Out-String
  if ($st -notmatch "State:\s+running") {
    Write-Host "Kubernetes is not running. Starting..."
    docker desktop kubernetes reset-cluster 2>&1 | Out-Null
    for ($i = 1; $i -le 30; $i++) {
      Start-Sleep -Seconds 5
      $st = docker desktop kubernetes status 2>&1 | Out-String
      if ($st -match "State:\s+running") { return }
    }
    throw "Kubernetes did not start. Open Docker Desktop -> Kubernetes -> ensure cluster is running."
  }
}

function Load-ImagesIntoKind {
  $kind = Get-Command kind -ErrorAction SilentlyContinue
  if (-not $kind) {
    Write-Host "kind CLI not found — skipping explicit image load (use Kubeadm mode if pulls fail)."
    return
  }
  $cluster = "desktop"
  $clusters = kind get clusters 2>&1
  if ($clusters -match "docker-desktop") { $cluster = "docker-desktop" }
  elseif ($clusters -match "desktop") { $cluster = "desktop" }
  Write-Host "Loading images into kind cluster '$cluster'..."
  foreach ($img in @("vahan360-web:latest", "vahan360-api-express:latest", "vahan360-worker:latest")) {
    kind load docker-image $img --name $cluster 2>&1
  }
}

Write-Host "=== 1. Kubernetes ==="
Ensure-K8sRunning
kubectl get nodes

Write-Host "`n=== 2. Postgres + Redis (Compose on host) ==="
docker compose up -d postgres redis
Start-Sleep -Seconds 4

Write-Host "`n=== 3. Ensure images exist ==="
$missing = @()
foreach ($img in @("vahan360-web:latest", "vahan360-api-express:latest", "vahan360-worker:latest")) {
  if (-not (docker image inspect $img 2>$null)) { $missing += $img }
}
if ($missing.Count -gt 0) {
  Write-Host "Building missing images..."
  & "$root\deploy\scripts\docker-build-all.ps1"
}

Write-Host "`n=== 4. Load images into kind (if applicable) ==="
Load-ImagesIntoKind

Write-Host "`n=== 5. Helm deploy ==="
helm upgrade --install vahan360 "$root\deploy\helm\vahan360" `
  -n vahan360 --create-namespace `
  -f "$root\deploy\helm\vahan360\values-local-k8s.yaml" `
  --timeout 8m

Write-Host "`n=== 6. Rollout ==="
kubectl rollout status deployment/vahan360-vahan360-api-express -n vahan360 --timeout=300s
kubectl rollout status deployment/vahan360-vahan360-web -n vahan360 --timeout=300s
kubectl rollout status deployment/vahan360-vahan360-worker -n vahan360 --timeout=300s

kubectl get pods -n vahan360

Write-Host @"

Done. Access:
  kubectl port-forward -n vahan360 svc/vahan360-vahan360-web 3000:3000
  kubectl port-forward -n vahan360 svc/vahan360-vahan360-api-express 3001:3001

  Web: http://localhost:3000
  API health: http://localhost:3001/health

If ImagePullBackOff: Docker Desktop -> Kubernetes -> Reset cluster -> choose **Kubeadm** (not kind), then re-run this script.
"@
