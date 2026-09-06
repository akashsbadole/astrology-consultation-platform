# --- Stage 1: build dependencies in an isolated layer ---
FROM python:3.12-slim AS builder

WORKDIR /app

# Needed to build a couple of Python packages with native extensions
# (argon2-cffi, asyncpg) — removed again in the final stage below so they
# don't bloat the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: slim runtime image ---
FROM python:3.12-slim

WORKDIR /app

# Create a non-root user — never run the app as root in a container that's
# reachable from the internet.
RUN useradd --create-home --shell /bin/bash appuser

COPY --from=builder /root/.local /home/appuser/.local
COPY . .

RUN chown -R appuser:appuser /app
USER appuser

ENV PATH=/home/appuser/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

# healthcheck hits the app's own /health route (see app/main.py) — this is
# what docker-compose's `condition: service_healthy` waits on.
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# 2 workers is a sane default for a small/medium VPS (e.g. 2 vCPU). Bump
# this via the WEB_CONCURRENCY env var in docker-compose.yml if you size
# up the box — do NOT just hardcode a bigger number here.
CMD ["sh", "-c", "gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY:-2} -b 0.0.0.0:8000 --access-logfile - --error-logfile -"]
