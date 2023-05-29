FROM node:16
WORKDIR /root

COPY . .
RUN npm ci

ENTRYPOINT ["node", "index.js"]
EXPOSE 3000