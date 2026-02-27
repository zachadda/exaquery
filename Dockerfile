# ============================================================================
# Base
# ============================================================================

FROM alpine:3.8 as base

RUN apk --no-cache add python3

WORKDIR /app


# ============================================================================
# Code
# ============================================================================

FROM base AS code

COPY ui/ ui/
COPY backend/ backend/
COPY run.sh run.sh

# ============================================================================
# Build Python
# ============================================================================

FROM alpine:3.8 AS build_py

RUN apk --no-cache add \
    build-base \
    python3-dev \
    py3-pip \
    libffi-dev \
    gcc \
    musl-dev

WORKDIR /app/backend

# Upgrade pip to the latest version
RUN pip3 install --upgrade pip

COPY --from=code /app/backend/requirements.txt .

RUN pip3 install -r requirements.txt




# ============================================================================
# Build JavaScript
# ============================================================================

FROM node:14-alpine AS build_js

WORKDIR /app/ui

COPY --from=code /app/ui/package.json .
COPY --from=code /app/ui/yarn.lock .

RUN yarn install  # Install dependencies, including node-sass
RUN yarn upgrade caniuse-lite  # Update caniuse-lite

#RUN yarn

COPY --from=code /app/ui/ .

RUN yarn build



# ============================================================================
# Final
# ============================================================================

FROM base AS final

# Copy Python packages
COPY --from=build_py /usr/lib/python3.6/site-packages /usr/lib/python3.6/site-packages

# Copy code
COPY --from=code /app/ .
COPY --from=build_js /app/ui/build ui/build

EXPOSE 8080

ENV SETTINGS=settings.prod

CMD ["sh", "./run.sh"]
