# QR DRF Backend

Backend Django REST Framework bilan quriladi. Database: PostgreSQL (`QR` database).

## Local Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 127.0.0.1:8000
```

`.env` ichida local Postgres qiymatlari:

```env
DB_NAME=QR
DB_USER=postgres
DB_PASSWORD=root
DB_HOST=127.0.0.1
DB_PORT=5432
```

## API

- `GET /api/tenants/`
- `GET /api/tenants/{slug}/`
- `GET /api/sites/`
- `GET /api/sites/by-slug/{slug}/`
- `GET /api/domains/`

Local backend URL:

```text
http://127.0.0.1:8000
```

Verified endpoints:

```text
http://127.0.0.1:8000/api/tenants/
http://127.0.0.1:8000/api/sites/by-slug/gulasal/
```

## Notes

- Hozir auth yo'q. Admin/auth keyingi bosqichda qo'shiladi.
- Site content `blocks` JSON sifatida saqlanadi, frontenddagi block contract bilan mos.
- Current seed command creates tenants/sites with empty blocks. Frontend demo block data should be moved into `seed_demo` next.
- Draft/published version keyingi migrationda alohida ajratiladi.
