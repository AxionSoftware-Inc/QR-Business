# Production Ops

## Health checks

- Frontend/public: `https://qr.dirac.space/sabina`
- Backend health: `https://qr.dirac.space/api/health/`
- QR generation: `https://qr.dirac.space/api/qr?url=https%3A%2F%2Fqr.dirac.space%2Fsabina`

Expected backend health response:

```json
{"status":"ok","database":"ok","sites":0,"time":"..."}
```

## Rate limits

DRF throttles are controlled by environment variables:

- `THROTTLE_ANON`, default `600/hour`
- `THROTTLE_GUEST_CREATE`, default `20/hour`
- `THROTTLE_GUEST_UPDATE`, default `60/hour`
- `THROTTLE_SLUG_CHECK`, default `120/min`
- `THROTTLE_UPLOAD_MEDIA`, default `30/hour`

## Backups

Manual backup from the server:

```bash
cd /home/legion/QR-Business/backend
. .venv/bin/activate
python manage.py backup_database --output-dir /home/legion/qr-backups
```

Suggested cron:

```cron
15 3 * * * cd /home/legion/QR-Business/backend && . .venv/bin/activate && python manage.py backup_database --output-dir /home/legion/qr-backups >> /home/legion/qr-backups/backup.log 2>&1
```

Restore example:

```bash
pg_restore --clean --if-exists --no-owner --dbname QR /home/legion/qr-backups/QR-YYYYMMDD-HHMMSS.dump
```

Restore drill without touching production DB:

```bash
cd /home/legion/QR-Business/backend
. .venv/bin/activate
python manage.py restore_drill --backup-dir /home/legion/qr-backups
```

## PM2 checks

```bash
pm2 status
pm2 logs qr-business-frontend --lines 100
pm2 logs qr-business-backend --lines 100
```
