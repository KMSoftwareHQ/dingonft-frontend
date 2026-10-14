const http = require("node:http");

const responses = {
  "/getPlatformStats": { totalVolume: null },
  "/collection/queryByTradeCountScaled": { results: ["dev-dingos"] },
  "/collection/queryByTradeVolume": { results: ["dev-dingos"] },
  "/collection/queryByTradeVolumeScaled": { results: ["dev-dingos"] },
  "/collection/queryByValuable": { results: ["dev-dingos"] },
  "/collection/queryBySearch": { results: [] },
  "/collection/getStats": { count: 1, tradeVolume: "0", tradeCount: 0 },
  "/collection/getItems": { results: [] },
  "/collection/getItemCollection": { handle: null },
  "/nft/query": { results: [] },
  "/nft/queryByNewest": { results: [] },
  "/nft/queryBySearch": { results: [] },
  "/nft/getBusy": { busy: false },
  "/profile/queryByTradeCount": { results: [] },
  "/profile/queryByEarnings": { results: [] },
  "/profile/queryBySearch": { results: [] },
  "/profile/getCreatedCount": 0,
  "/profile/getCollectionCount": 0,
  "/profile/getHistoricalCount": 0,
};

const server = http.createServer((request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  const path = new URL(request.url, "http://provider").pathname;
  const body = responses[path] ?? { results: [] };
  request.resume();
  response.writeHead(200, {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
  });
  response.end(JSON.stringify(body));
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Deterministic NFT provider fixture listening on :3000");
});
