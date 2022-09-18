const { ShardingManager } = require("discord.js");
require("dotenv").config();

// web
const web = require("./web.js");

const manager = new ShardingManager("./bot.js", {
  token: process.env.TOKEN,
  totalShards: "auto",
});

manager.on("shardCreate", (shard) => console.log(`Launched shard ${shard.id}`));
manager.spawn();
