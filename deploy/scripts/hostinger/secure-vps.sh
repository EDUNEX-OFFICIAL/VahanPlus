#!/usr/bin/env bash
# Lock down Docker-published DB/Redis/dev API ports on the Hostinger VPS.
# Allows: localhost, k3s pods (10.42.0.0/16), Docker bridges (172.16.0.0/12).
# Blocks: WAN (eth0) access to sensitive ports.
#
# Usage (on VPS as root):
#   ./deploy/scripts/hostinger/secure-vps.sh
#   ./deploy/scripts/hostinger/secure-vps.sh --dry-run

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

WAN_IF="${WAN_IF:-eth0}"
K3S_CIDR="${K3S_CIDR:-10.42.0.0/16}"
DOCKER_CIDR="${DOCKER_CIDR:-172.16.0.0/12}"
SENSITIVE_PORTS=(54322 32459 15432 6379 6380 3000 3001 4000)

run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

echo "==> Securing VPS — WAN interface: ${WAN_IF}"

# Ensure DOCKER-USER chain exists (Docker creates it on first container start).
if ! iptables -L DOCKER-USER -n &>/dev/null; then
  run iptables -N DOCKER-USER
  run iptables -I FORWARD -j DOCKER-USER
fi

# Remove previous rules tagged by our marker comment (idempotent re-run).
if ! $DRY_RUN; then
  while iptables -L DOCKER-USER -n --line-numbers | grep -q "vahanplus-secure"; do
    num=$(iptables -L DOCKER-USER -n --line-numbers | grep "vahanplus-secure" | head -1 | awk '{print $1}')
    iptables -D DOCKER-USER "$num"
  done
  while iptables -L INPUT -n --line-numbers | grep -q "vahanplus-secure"; do
    num=$(iptables -L INPUT -n --line-numbers | grep "vahanplus-secure" | head -1 | awk '{print $1}')
    iptables -D INPUT "$num"
  done
fi

# --- DOCKER-USER (forwarded Docker traffic) ---
run iptables -I DOCKER-USER -m comment --comment "vahanplus-secure: allow loopback" -i lo -j RETURN
run iptables -I DOCKER-USER -m comment --comment "vahanplus-secure: allow established" -m conntrack --ctstate RELATED,ESTABLISHED -j RETURN
run iptables -I DOCKER-USER -m comment --comment "vahanplus-secure: allow k3s pods" -s "${K3S_CIDR}" -j RETURN
run iptables -I DOCKER-USER -m comment --comment "vahanplus-secure: allow docker bridges" -s "${DOCKER_CIDR}" -j RETURN

for port in "${SENSITIVE_PORTS[@]}"; do
  run iptables -A DOCKER-USER -m comment --comment "vahanplus-secure: block wan :${port}" \
    -i "${WAN_IF}" -p tcp --dport "${port}" -j DROP
done
run iptables -A DOCKER-USER -m comment --comment "vahanplus-secure: default return" -j RETURN

# --- INPUT (host-published Docker ports hit INPUT on many setups) ---
run iptables -I INPUT -m comment --comment "vahanplus-secure: allow established" -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

for port in "${SENSITIVE_PORTS[@]}"; do
  run iptables -I INPUT -m comment --comment "vahanplus-secure: allow k3s :${port}" \
    -p tcp -s "${K3S_CIDR}" --dport "${port}" -j ACCEPT
  run iptables -I INPUT -m comment --comment "vahanplus-secure: allow docker :${port}" \
    -p tcp -s "${DOCKER_CIDR}" --dport "${port}" -j ACCEPT
  run iptables -I INPUT -m comment --comment "vahanplus-secure: allow local :${port}" \
    -p tcp -s 127.0.0.0/8 --dport "${port}" -j ACCEPT
done

for port in "${SENSITIVE_PORTS[@]}"; do
  run iptables -A INPUT -m comment --comment "vahanplus-secure: drop public :${port}" \
    -p tcp --dport "${port}" -j DROP
done

# Persist across reboots (do not install iptables-persistent — it conflicts with ufw).
if ! $DRY_RUN; then
  mkdir -p /etc/iptables
  iptables-save > /etc/iptables/rules.v4
  if [[ ! -f /etc/rc.local ]] || ! grep -q vahanplus-secure /etc/rc.local 2>/dev/null; then
    cat > /etc/systemd/system/vahanplus-secure-iptables.service <<'UNIT'
[Unit]
Description=Restore VahanPlus secure iptables rules
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/vahanplus/deploy/scripts/hostinger/secure-vps.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
    systemctl enable vahanplus-secure-iptables.service
  fi
fi

echo "==> Firewall rules applied for ports: ${SENSITIVE_PORTS[*]}"
echo "    Allowed sources: 127.0.0.0/8, ${K3S_CIDR}, ${DOCKER_CIDR}"
echo "    Blocked: ${WAN_IF} (public internet) → sensitive ports"
