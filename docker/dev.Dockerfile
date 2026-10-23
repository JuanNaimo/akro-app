# Imagen de desarrollo para el API y la web. El código no se copia: entra por bind mount
# desde docker-compose.yml, y node_modules vive en volúmenes propios del contenedor.
FROM node:22-alpine

# openssl lo usa el motor de migraciones de Prisma. La versión de pnpm es la de package.json.
RUN apk add --no-cache openssl \
 && npm install -g pnpm@12.11.2

WORKDIR /app
