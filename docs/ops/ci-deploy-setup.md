# CI deploy setup (push → live)

After one-time setup below, **routine deploy = `git push` to `main`**. GitHub builds images; **deploy runs on the VPS** via a [self-hosted runner](github-self-hosted-runner.md) (no inbound SSH from GitHub — avoids `dial tcp :22: i/o timeout` on Hostinger).

## What you do manually (one time)

### 1. GitHub repository

**Settings → Secrets and variables → Actions**

| Type     | Name                  | Value                                         |
| -------- | --------------------- | --------------------------------------------- |
| Variable | `NEXT_PUBLIC_API_URL` | `https://exp.vahan360.info/api` (your domain) |

`DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY` are **not used** anymore (SSH deploy removed).

`GHCR_ORG` on the VPS (`hostinger.env`) must match the GitHub org/user that owns the repo (images are `ghcr.io/<repository_owner>/...`).

### 2. Self-hosted runner on the VPS

Follow **[github-self-hosted-runner.md](github-self-hosted-runner.md)** — register runner with label **`vahanplus`**, install as a service, confirm **Idle** in GitHub.

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

### Verify images after deploy

On the VPS (or any host with `kubectl`):

```bash
cd /opt/vahanplus
./deploy/scripts/verify-live-images.sh "$(git rev-parse --short=7 HEAD)"
```

CI runs the same check at the end of the **deploy** job (`EXPECTED_IMAGE_TAG` = short commit SHA). Production uses the **SHA tag**, not floating `:latest` (see [docker-compose-vs-k3s.md](docker-compose-vs-k3s.md)).

Emergency (CI broken):

```bash
ssh VPS
cd /opt/vahanplus
./deploy/scripts/redeploy-live.sh   # builds on VPS (slow)
```

## What the repo does automatically

On push to `main` / `master`:

1. Build & push `vahanplus-web`, `vahanplus-api-express`, `vahanplus-worker` to GHCR (tag = short git SHA)
2. **Self-hosted runner** on VPS → `git pull` + `deploy/scripts/rollout-ghcr.sh` with that tag

`workflow_dispatch` on the workflow can re-run deploy without a new commit.
