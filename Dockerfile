FROM node:16-alpine
WORKDIR /root

COPY . .
RUN npm ci

ENTRYPOINT ["node", "index.js"]
EXPOSE 3000