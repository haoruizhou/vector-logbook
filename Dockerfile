# syntax=docker/dockerfile:1

# ---------- stage 1: build the SPA ----------
FROM node:22-slim AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- stage 2: python runtime ----------
FROM python:3.12-slim AS app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Python deps (cached unless the lockfile changes)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# App code
COPY backend/app ./app

# Bundle coordinate datasets so first boot works fully offline. Airports/navaids
# are small and fetched at build time; enroute fixes ship as a slim CSV
# (scripts/build_fixes.py). All are refreshed at runtime (fixes are edition-gated
# against the FAA NASR 28-day cycle, so the big download only happens on change).
ADD https://davidmegginson.github.io/ourairports-data/airports.csv /app/datasets/bundled/airports.csv
ADD https://davidmegginson.github.io/ourairports-data/navaids.csv /app/datasets/bundled/navaids.csv
COPY backend/datasets/bundled/fixes.csv ./datasets/bundled/fixes.csv

# Built SPA served by FastAPI at /
COPY --from=web /web/dist ./app/static

ENV LOGBOOK_DATA_DIR=/data
VOLUME /data
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
