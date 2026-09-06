# syntax=docker/dockerfile:1

ARG GO_VERSION=1.25-bookworm
ARG NODE_VERSION=22-bookworm-slim

FROM golang:${GO_VERSION} AS tool-builder

ARG NUCLEI_VERSION=latest
ARG SUBFINDER_VERSION=latest

RUN go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@${NUCLEI_VERSION} \
  && go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@${SUBFINDER_VERSION}

FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production \
  PORT=3001 \
  HOME=/home/node \
  NUCLEI_TEMPLATES_DIR=/home/node/nuclei-templates

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    dumb-init \
    nmap \
    python3 \
    sqlmap \
  && rm -rf /var/lib/apt/lists/*

COPY --from=tool-builder /go/bin/nuclei /usr/local/bin/nuclei
COPY --from=tool-builder /go/bin/subfinder /usr/local/bin/subfinder

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build \
  && npm prune --omit=dev \
  && mkdir -p /app/data /home/node/nuclei-templates \
  && chown -R node:node /app /home/node

USER node

RUN nuclei -update-templates -silent || true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["dumb-init", "node", "server/index.js"]
