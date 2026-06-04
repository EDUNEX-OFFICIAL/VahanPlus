# CI deploy setup (push → live)

After one-time setup below, **routine deploy = `git push` to `main`**. GitHub builds images and rolls out to k3s on the VPS.

## What you do manually (one time)

### 1. GitHub repository

**Settings → Secrets and variables → Actions**

| Type     | Name                  | Value                                         |
| -------- | --------------------- | --------------------------------------------- |
| Secret   | `DEPLOY_HOST`         | VPS public IP or hostname                     |
| Secret   | `DEPLOY_USER`         | SSH user (e.g. `root`)                        |
| Secret   | `DEPLOY_SSH_KEY`      | Private key (full PEM), see step 2            |
| Variable | `NEXT_PUBLIC_API_URL` | `https://exp.vahan360.info/api` (your domain) |

Optional variable `DEPLOY_REPO_PATH` (default `/opt/vahanplus`).

`GHCR_ORG` on the VPS (`hostinger.env`) must match the GitHub org/user that owns the repo (images are `ghcr.io/<repository_owner>/...`).

### 2. SSH key for GitHub Actions → VPS

On your **laptop** (or anywhere):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/vahanplus-gha-deploy -N ""
```

On the **VPS**:

```bash
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys <<'EOF'
<paste contents of vahanplus-gha-deploy.pub>
EOF
chmod 600 ~/.ssh/authorized_keys
```

Copy **private** key contents into GitHub secret `DEPLOY_SSH_KEY`.

Test from laptop:

```bash
ssh -i ~/.ssh/vahanplus-gha-deploy DEPLOY_USER@DEPLOY_HOST 'kubectl get pods -n vahanplus'
```

Deploy user needs `helm`, `kubectl`, and read access to `/opt/vahanplus` (for `rollout-ghcr.sh`).

### 3. VPS (already done if site is live)

- Repo at `/opt/vahanplus`
- `deploy/env/hostinger.env` filled (not committed)
- `GHCR_USERNAME` + `GHCR_TOKEN` (`read:packages`) — pods pull images
- k3s + Helm release `vahanplus` in namespace `vahanplus`

No need to run `docker build` on the VPS for normal releases.

## Daily workflow (you)

```bash
git push origin main
```

Watch **Actions → Docker Publish** → build jobs green → **deploy** job green → check site.

Emergency (CI broken):

```bash
ssh VPS
cd /opt/vahanplus
./deploy/scripts/redeploy-live.sh   # builds on VPS (slow)
```

## What the repo does automatically

On push to `main` / `master`:

1. Build & push `vahanplus-web`, `vahanplus-api-express`, `vahanplus-worker` to GHCR (tag = short git SHA)
2. SSH to VPS → `deploy/scripts/rollout-ghcr.sh` with that tag

`workflow_dispatch` on the workflow can re-run deploy without a new commit.
