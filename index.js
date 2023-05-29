const express = require("express");
const client = require("prom-client");
const axios = require("axios");
require("dotenv").config();

const Registry = client.Registry;

const app = express();
const port = 3000;
const loopDelay = 300000;

const register = new Registry();
const balanceGauge = new client.Gauge({
  name: "jprovd_balance",
  help: "The balance of the provider account",
  labelNames: ["provider"],
});
const spaceUsedGauge = new client.Gauge({
  name: "jprovd_used_space",
  help: "The used space",
  labelNames: ["provider"],
});
const spaceTotalGauge = new client.Gauge({
  name: "jprovd_total_space",
  help: "The total space provided",
  labelNames: ["provider"],
});
const filesGauge = new client.Gauge({
  name: "jprovd_numfiles",
  help: "The number of files stored",
  labelNames: ["provider"],
});
register.registerMetric(balanceGauge);
register.registerMetric(spaceUsedGauge);
register.registerMetric(spaceTotalGauge);
register.registerMetric(filesGauge);

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  console.log("Getting metrics...");
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  (async () => {
    let i = 0;
    while (true) {
      const startTime = new Date().valueOf();
      console.log("Update loop", i++);
      await updateStats();
      const doneTime = new Date().valueOf();
      const waitTime = Math.max(0, startTime - doneTime + loopDelay);
      console.log(`Sleeping for ${Math.round(waitTime / 1000)} seconds...`);
      await sleep(waitTime);
    }
  })();
});

const sleep = async millis =>
  new Promise(resolve => setTimeout(resolve, millis));

const updateStats = async () => {
  let next_key = null;
  let providers = [];

  do {
    providers = [
      ...providers,
      ...(await axios
        .get(
          `${process.env.RPC}/jackal-dao/canine-chain/storage/providers${
            next_key ? `?pagination.key=${next_key}` : ""
          }`
        )
        .then(response => {
          next_key = response.data.pagination.next_key;
          return response.data.providers;
        })
        .then(providers => providers.map(provider => provider.ip))),
    ];
  } while (next_key);
  providers = [...new Set(providers)];
  console.log(`Polling ${providers.length} providers...`);
  await Promise.allSettled(
    providers.map(async pod => {
      const podName = pod.replace(/^https?:\/\//, "");
      try {
        console.log("Fetching balance from", podName);
        await axios
          .get(`${pod}/api/network/balance`, { timeout: 10000 })
          .then(response => response.data.balance)
          .then(
            balance =>
              parseInt(balance.amount) &&
              balanceGauge.set({ provider: podName }, parseInt(balance.amount))
          )
          .catch(e => {
            console.log("Failed to get balance for", podName);
          });

        console.log("Fetching space from", podName);
        await axios
          .get(`${pod}/api/client/space`, { timeout: 10000 })
          .then(response => response.data)
          .then(space => {
            space.used_space &&
              spaceUsedGauge.set({ provider: podName }, space.used_space);
            space.total_space &&
              spaceTotalGauge.set({ provider: podName }, space.total_space);
          })
          .catch(e => {
            console.log("Failed to get space for", podName);
          });

        console.log("Fetching files from", podName);
        await axios
          .get(`${pod}/api/client/list`, { timeout: 10000 })
          .then(response => response.data.files)
          .then(
            files =>
              files.length &&
              filesGauge.set(
                { provider: podName },
                Math.floor(files.length / 2)
              )
          )
          .catch(e => {
            console.log("Failed to get files for", podName);
          });
      } catch (e) {
        console.log(e);
      }
    })
  );
};
