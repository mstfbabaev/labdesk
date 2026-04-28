# Dental Lab — Веб-приложение для зуботехнической лаборатории

## Стек технологий

- **Backend**: Python 3.12, FastAPI, PostgreSQL, SQLAlchemy 2 (async), Alembic
- **Frontend**: React 18, Vite, TanStack Query, React Router 6, CSS Modules
- **Хранилище файлов**: MinIO (S3-совместимое)

---

## Предварительные требования

- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
- MinIO (бинарник или сервис)

---

## Установка и запуск

### 1. Клонировать / распаковать проект

```bash
cd kwork
```

### 2. Запустить PostgreSQL и создать БД

```sql
CREATE DATABASE dental_lab;
CREATE USER dental WITH PASSWORD 'secret';
GRANT ALL PRIVILEGES ON DATABASE dental_lab TO dental;
```

### 3. Запустить MinIO

**Windows:**
```bash
# Скачать minio.exe с https://min.io/download
minio.exe server ./minio-data --console-address :9001
```

**Linux/macOS:**
```bash
minio server ./minio-data --console-address :9001
```

MinIO будет доступен:
- API: `http://localhost:9000`
- Консоль: `http://localhost:9001` (логин: minioadmin / minioadmin)

**Создать бакет в MinIO Console:**
1. Открыть `http://localhost:9001`
2. Войти (minioadmin / minioadmin)
3. Создать бакет `dental-files`
4. В настройках бакета установить CORS policy (добавить правило Allow PUT/GET с origin `http://localhost:5173`)

Или через mc CLI:
```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/dental-files
```

---

### 4. Настроить и запустить Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

Скопировать конфигурацию:
```bash
cp .env.example .env
```

Отредактировать `.env`:
```env
DATABASE_URL=postgresql+asyncpg://dental:secret@localhost:5432/dental_lab
SECRET_KEY=замените_на_длинную_случайную_строку_минимум_32_символа
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=dental-files
```

Применить миграции:
```bash
alembic upgrade head
```

Создать первого администратора:
```bash
python -m app.scripts.create_admin
```

Запустить сервер:
```bash
uvicorn app.main:app --reload --port 8000
```

Backend будет доступен:
- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

### 5. Запустить Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend будет доступен: `http://localhost:5173`

---

## Структура проекта

```
kwork/
├── backend/
│   ├── alembic/                  # Миграции БД
│   ├── app/
│   │   ├── api/v1/               # Роуты: auth, users, orders, files, comments
│   │   ├── core/                 # security.py, exceptions.py
│   │   ├── models/               # SQLAlchemy модели
│   │   ├── schemas/              # Pydantic схемы
│   │   ├── services/             # Бизнес-логика
│   │   ├── scripts/              # create_admin.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── components/           # UI-компоненты, layout, files, comments
        ├── contexts/             # AuthContext
        ├── hooks/                # useFileUpload
        ├── pages/                # Все страницы (admin + doctor)
        ├── services/             # API-сервисы
        └── styles/               # Глобальные стили и переменные
```

---

## Роли и функциональность

### Администратор
- Просмотр всех заказов с фильтрацией (врач, статус, дата) и сортировкой
- Смена статуса заказа: `новый → в работе → готов → выдан`
- Просмотр и скачивание файлов, добавление комментариев
- Управление врачами: создание, редактирование, деактивация

### Врач
- Создание заказов с загрузкой файлов (STL, ZIP, JPG, PNG, до 700 МБ)
- Просмотр своих заказов, догрузка и удаление файлов
- Комментарии к заказам

---

## Файловое хранилище (MinIO)

Загрузка файлов происходит **напрямую из браузера** в MinIO через presigned URL — сервер приложения не участвует в передаче данных. Это позволяет загружать файлы до 700 МБ с прогресс-баром.

Поток:
1. Браузер запрашивает у backend presigned PUT URL
2. Браузер загружает файл напрямую в MinIO через XHR
3. После успешной загрузки браузер подтверждает бэкенду, тот сохраняет запись в БД

---

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL (asyncpg) | `postgresql+asyncpg://user:pass@localhost/db` |
| `SECRET_KEY` | Секрет для JWT | Длинная случайная строка |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Время жизни access token | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Время жизни refresh token | `7` |
| `MINIO_ENDPOINT` | Хост:порт MinIO | `localhost:9000` |
| `MINIO_ACCESS_KEY` | Логин MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Пароль MinIO | `minioadmin` |
| `MINIO_BUCKET` | Название бакета | `dental-files` |
| `CORS_ORIGINS` | Разрешённые origins (через запятую) | `http://localhost:5173` |

---

## CORS для MinIO

Для работы прямой загрузки из браузера необходимо настроить CORS-политику в MinIO.

Через MinIO Console (`http://localhost:9001`):
1. Buckets → dental-files → Configuration → CORS
2. Добавить правило:
   - Allowed Origins: `http://localhost:5173`
   - Allowed Methods: `PUT`, `GET`, `HEAD`
   - Allowed Headers: `*`

Или через mc:
```bash
mc anonymous set download local/dental-files
```

---

## Первый запуск — пошаговая инструкция

1. Запустить PostgreSQL
2. Запустить MinIO: `minio server ./minio-data --console-address :9001`
3. Создать бакет `dental-files` в MinIO Console
4. Настроить CORS для бакета
5. `cd backend && alembic upgrade head`
6. `python -m app.scripts.create_admin` — ввести email, имя, пароль администратора
7. `uvicorn app.main:app --reload --port 8000`
8. В отдельном терминале: `cd frontend && npm install && npm run dev`
9. Открыть `http://localhost:5173` и войти как администратор
