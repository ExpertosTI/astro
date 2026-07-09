FROM node:22-alpine
WORKDIR /app
COPY index.mjs ./
EXPOSE 8789
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8789/healthz || exit 1
CMD ["node", "index.mjs"]
