FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat

RUN npm install -g pnpm@11.23.0

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm --version \
 && pnpm config get allow-builds \
 && pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "run", "start:dev"]
