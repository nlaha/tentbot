// IMPORTS
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Discord.Collection();

const fs = require("node:fs");
const path = require("node:path");

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection
  // With the key as the command name and the value as the exported module
  client.commands.set(command.data.name, command);
}

const node_redis = require("redis");

async function init_redis() {
  // REDIS
  const redis = node_redis.createClient({
    socket: {
      host: process.env.REDIS_HOSTNAME,
      port: process.env.REDIS_PORT,
      username: process.env.REDIS_USER,
    },
    password: process.env.REDIS_PASSWORD,
    database: process.env.REDIS_DB,
  });

  redis.on("error", (err) => console.log("Redis Client Error", err));

  await redis.connect();

  console.log("Connected to Redis");

  // flush redis mongo
  await redis.FLUSHALL();

  return Promise.resolve(redis);
}

async function init_mongo() {
  // MONGODB
  const MongoClient = require("mongodb").MongoClient;
  const mongo_client = new MongoClient(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  var mongo = await mongo_client.db(process.env.MONGODB_DBNAME);

  await mongo
    .collection("items")
    .createIndex({ id: 1 }, { unique: true, background: true });

  await mongo
    .collection("users")
    .createIndex({ user_id: 1 }, { unique: true, background: true });

  return Promise.resolve(mongo);
}

// TENOR
const tenor = require("tenorjs").client({
  Key: process.env.TENOR_KEY, // https://tenor.com/developer/keyregistration
  Filter: "off", // "off", "low", "medium", "high", not case sensitive
  Locale: "en_US", // Your locale here, case-sensitivity depends on input
  MediaFilter: "minimal", // either minimal or basic, not case sensitive
  DateFormat: "D/MM/YYYY - H:mm:ss A", // Change this accordingly
});

// MODULES
const interaction_handler = require("./interaction_handler.js");
const message_handler = require("./message_handler.js");

// BOT
client.on("warn", console.log);

// Load Event files from events folder
const eventFiles = fs.readdirSync("./events/").filter((f) => f.endsWith(".js"));

init_redis().then((redis) => {
  init_mongo().then(async (mongo) => {
    for (const file of eventFiles) {
      const event = require(`./events/${file}`);
      if (event.once) {
        client.once(event.name, (...args) =>
          event.execute(client, mongo, redis)
        );
      } else {
        client.on(event.name, (...args) => event.execute(client, mongo, redis));
      }
    }

    // parse messages
    message_handler.parseMessages(client, mongo, redis, tenor);

    // parse interactions
    interaction_handler.parseInteractions(client, mongo, redis);
  });
});

client.login(process.env.TOKEN);

module.exports = {
  client,
};
