const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  node: "http://localhost:9200", //  local ES server
});

module.exports = client;
