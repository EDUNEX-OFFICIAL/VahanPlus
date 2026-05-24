# Rename: Vahan360 → VahanPlus

The codebase uses **VahanPlus** branding and technical IDs (`@vahanplus/*`, `vahanplus-*` images, Helm chart `deploy/helm/vahanplus`).

## GitHub repository

1. On GitHub: **Settings → General → Repository name** → `VahanPlus`
2. Update local remote:
   ```bash
   git remote set-url origin https://github.com/<org>/VahanPlus.git
   ```
3. Optionally rename the local folder from `Vahan360` to `VahanPlus`.

## Container images (GHCR)

New image names:

- `ghcr.io/<org>/vahanplus-web`
- `ghcr.io/<org>/vahanplus-api-express`
- `ghcr.io/<org>/vahanplus-worker`

Push to `main` after setting `NEXT_PUBLIC_API_URL` for the web build. Old `vahan360-*` tags can be deleted when nothing references them.

## Existing servers (e.g. Hostinger)

If Postgres was created as user/db **`vahan360`**, keep your `.env` / secrets as-is:

```env
DATABASE_URL=postgresql://vahan360:<password>@...
```

New greenfield installs use `vahanplus` / `vahanplus` (see `.env.example`). To migrate data:

```bash
pg_dump -U vahan360 vahan360 > backup.sql
# create vahanplus user/db, then psql -U vahanplus vahanplus < backup.sql
```

## Kubernetes

- Namespace: `vahanplus`
- Helm release: `vahanplus`
- Secret: `vahanplus-app-secrets`
- Values file: `deploy/helm/vahanplus/values-hostinger-kvm4.yaml`

## Browser / local dev

JWT is stored under `vahanplus_token` — users must **log in again** after the rename.
