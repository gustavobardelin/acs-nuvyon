FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat

RUN npm install -g pnpm@11.23.0

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 3001

CMD ["pnpm", "run", "start"]
