#!/usr/bin/env bash
# One-time Hostinger KVM4 bootstrap: Docker, k3s, ingress-nginx, cert-manager, Helm.
# Run on Ubuntu 24.04 as a sudo user.
#
#   export LETSENCRYPT_EMAIL=admin@yourdomain.com
#   ./deploy/scripts/hostinger/bootstrap-k3s.sh

set -euo pipefail

LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
INSTALL_UFW="${INSTALL_UFW:-true}"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root or with sudo: sudo $0"
  exit 1
fi

echo "==> Install Docker (for Postgres/Redis Compose on host)"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME:-$VERSION_ID}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable --now docker

echo "==> Install k3s (Traefik disabled — use ingress-nginx)"
if ! command -v k3s >/dev/null 2>&1; then
  curl -sfL https://get.k3s.io | sh -s - - --disable traefik --write-kubeconfig-mode 644
fi
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "==> Wait for node Ready"
kubectl wait --for=condition=Ready node --all --timeout=120s

echo "==> Install ingress-nginx (hostNetwork for single VPS on ports 80/443)"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/cloud/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s || true

# Bind controller to host ports 80/443 on single-node VPS
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type=json -p='[
  {"op": "add", "path": "/spec/template/spec/hostNetwork", "value": true},
  {"op": "replace", "path": "/spec/template/spec/dnsPolicy", "value": "ClusterFirstWithHostNet"}
]' 2>/dev/null || true

kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=180s

echo "==> Install cert-manager"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.2/cert-manager.yaml
kubectl wait --namespace cert-manager \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager \
  --timeout=180s || true

if [[ -n "$LETSENCRYPT_EMAIL" ]]; then
  echo "==> ClusterIssuer letsencrypt-prod"
  kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ${LETSENCRYPT_EMAIL}
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
else
  echo "WARN: LETSENCRYPT_EMAIL not set — skip ClusterIssuer. Set it and re-run or apply issuer manually."
fi

echo "==> Install Helm"
if ! command -v helm >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

if [[ "$INSTALL_UFW" == "true" ]] && command -v ufw >/dev/null 2>&1; then
  echo "==> UFW: allow SSH, HTTP, HTTPS"
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  echo "    Run 'ufw enable' after confirming SSH access is safe."
fi

echo ""
echo "Bootstrap complete."
echo "  KUBECONFIG=/etc/rancher/k3s/k3s.yaml"
echo "  Next: clone repo, configure deploy/env/hostinger.env, run deploy/scripts/hostinger/deploy.sh"
