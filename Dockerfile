# ============================================================================
# Build Python
# ============================================================================

FROM python:3.12-alpine AS build_py

RUN apk --no-cache add \
    build-base \
    libffi-dev \
    gcc \
    musl-dev

WORKDIR /app/backend

COPY backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# ============================================================================
# Build JavaScript
# ============================================================================

FROM node:20-alpine AS build_js

WORKDIR /app/ui

COPY ui/package.json ui/package-lock.json* ./

RUN npm ci

COPY ui/ .

RUN npm run build

# ============================================================================
# Final
# ============================================================================

FROM python:3.12-alpine AS final

WORKDIR /app

# Copy Python packages
COPY --from=build_py /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages

# Copy backend code
COPY backend/ backend/
COPY run.sh run.sh

# Copy built UI
COPY --from=build_js /app/ui/dist ui/dist

EXPOSE 8080

ENV SETTINGS=settings.prod

CMD ["sh", "./run.sh"]
