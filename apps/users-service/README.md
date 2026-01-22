# users-service

Из корня репозитория:

1) Поднять инфраструктуру:
```
cd infra
docker compose up -d
```

2) Создать env для users-service:
```
cd ../apps/users-service
cp .env.example .env
```

3) Экспортировать env в shell:
```
set -a
source .env
set +a
```
 
4) Проверить, что в `.env` заданы JWT секреты и TTL:
```
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

5) Запустить сервис:
```
cd ../..
npm run serve:users
```

# Миграции

```
DATABASE_URL=postgres://users:users@localhost:5433/users nx run users-service:migration:run
DATABASE_URL=postgres://users:users@localhost:5433/users nx run users-service:migration:revert
```
