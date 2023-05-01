# Prometheus publisher for Jackal storage providers.

Docker image is available at `brochain/jprovd-metrics-publisher` on Docker Hub.

## Installation

```bash
git clone https://github.com/Bro-Chain/jprovd-metrics-publisher.git
cd jprovd-metrics-publisher
npm install
npm run start
```

The server is now available at `localhost:3000`.

## Running with Docker

```bash
docker run --rm -it -p 3000:3000 brochain/jprovd-metrics-publisher
```

The metrics are now available at `http://localhost:3000`.

```bash
curl http://localhost:3000
```
