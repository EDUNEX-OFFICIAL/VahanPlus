# GitHub self-hosted runner (VPS deploy)

GitHub-hosted runners **cannot SSH** into this VPS when Hostinger/cloud firewall blocks port **22** from the internet (`dial tcp …:22: i/o timeout`). Images still build on GitHub; **deploy runs on the VPS** via a self-hosted runner.

## One-time setup (on the VPS)

1. GitHub → **EDUNEX-OFFICIAL/VahanPlus** → **Settings → Actions → Runners → New self-hosted runner**
2. Choose **Linux** / **x64**
3. Copy the registration commands GitHub shows (token expires quickly)

On the VPS (as `root` or a user with `kubectl`, `helm`, and `/opt/vahanplus`):

```bash
mkdir -p /opt/actions-runner && cd /opt/actions-runner

# Paste GitHub's curl + tar commands here, then:
./config.sh --url https://github.com/EDUNEX-OFFICIAL/VahanPlus \
  --token <TOKEN_FROM_GITHUB> \
  --name vahanplus-vps \
  --labels vahanplus \
  --unattended

sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

Runner must run where:

- `KUBECONFIG=/etc/rancher/k3s/k3s.yaml` works (or same user as k3s admin)
- `/opt/vahanplus/deploy/env/hostinger.env` exists
- `docker login ghcr.io` works for image pull (pods use cluster pull secret)

Verify in GitHub: **Settings → Actions → Runners** → runner **Idle** (green).

## What runs on push

| Job              | Where                               | Purpose                                       |
| ---------------- | ----------------------------------- | --------------------------------------------- |
| `build-and-push` | GitHub cloud                        | Build & push images to GHCR                   |
| `deploy`         | **self-hosted** (`vahanplus` label) | `git pull` + `rollout-ghcr.sh` on this server |

No `DEPLOY_HOST` / `DEPLOY_SSH_KEY` needed for deploy.

## Manual deploy (no runner)

Images are already on GHCR after a green **Docker Publish** build:

```bash
cd /opt/vahanplus
git pull
export IMAGE_TAG=<7-char commit SHA from GitHub>
./deploy/scripts/rollout-ghcr.sh
```

## Optional: open SSH for cloud deploy

If you prefer `appleboy/ssh-action` instead of a runner, open **TCP 22** to the world in **Hostinger hPanel → Firewall** (GitHub Actions uses changing IPs). Not required when using the self-hosted runner.
