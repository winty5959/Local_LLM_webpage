# --- client build ---
FROM node:20-alpine AS client-build
WORKDIR /client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- server runtime ---
FROM node:20-alpine AS server
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/src ./src
COPY --from=client-build /client/dist ./public

EXPOSE 3000
CMD ["npm", "start"]
