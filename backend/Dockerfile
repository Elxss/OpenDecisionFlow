FROM oven/bun:1-alpine AS base
WORKDIR /app

# Dépendances
COPY package.json package-lock.json* ./
RUN bun install --frozen-lockfile --production

# Code source
COPY . .

# Répertoire données (sera monté en volume)
RUN mkdir -p /app/data

# Utilisateur non-root pour limiter la surface d'attaque
RUN addgroup -S app && adduser -S app -G app
RUN chown -R app:app /app
USER app

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["bun", "run", "start"]
