FROM node:22-alpine

# Listen on port 80 by default: UniFi always sends guests to http://<portal-ip>/ (port 80).
# This matters when the container has its own IP on a network (macvlan/ipvlan), where
# Docker port mappings don't apply.
ENV NODE_ENV=production \
    PORT=80

# Let the unprivileged "node" user bind to port 80.
RUN apk add --no-cache libcap \
 && setcap 'cap_net_bind_service=+ep' "$(readlink -f "$(command -v node)")" \
 && apk del libcap

WORKDIR /app
COPY package.json server.js holidays.js ./
COPY public ./public

USER node
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "server.js"]
