# Docker Deployment

## Start

```bash
docker compose up --build -d
```

Site URL: `http://localhost:8090`

## Stop

```bash
docker compose down
```

## Reset Database

```bash
docker compose down -v
docker compose up --build -d
```

## Notes

- Web listens on host port `8090`.
- MySQL listens on host port `3307`.
- Uploaded files persist in `frontend/assets/uploads`.
- App logs persist in `logs`.
- Database initialization imports `database/schema.sql` and every file in `database/migrations/*.sql`.
