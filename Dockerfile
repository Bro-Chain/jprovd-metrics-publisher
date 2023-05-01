FROM node:16-alpine

COPY . .
RUN npm ci

ENTRYPOINT ["node", "index.js"]
EXPOSE 3000