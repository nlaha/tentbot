// IMPORTS
const Discord = require("discord.js");
const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
  ],
});
const { REST } = require("@discordjs/rest");

const prefix = "!";

// REDIS
const redis = require("redis");
const redis_client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOSTNAME,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USER,
  },
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB,
});

redis_client.connect();

redis_client.on("error", (err) => console.log("Redis Client Error", err));

// MONGODB
const MongoClient = require("mongodb").MongoClient;
const mongo_client = new MongoClient(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongo_client.connect(function (err) {
  if (!err) {
    console.log("Connected successfully to MongoDB server");
  } else {
    console.error("Error connecting to MongoDB server: " + err);
  }

  db = mongo_client.db(process.env.MONGODB_DBNAME);

  db.collection("items").createIndex(
    { id: 1 },
    { unique: true, background: true }
  );

  db.collection("users").createIndex(
    { user_id: 1 },
    { unique: true, background: true }
  );

  const { promisify } = require("util");

  // modules
  const tentrpg = require("./tentrpg.js");
  const interaction_handler = require("./interaction_handler.js");
  const message_handler = require("./message_handler.js");

  // TENOR
  const Tenor = require("tenorjs").client({
    Key: process.env.TENOR_KEY, // https://tenor.com/developer/keyregistration
    Filter: "off", // "off", "low", "medium", "high", not case sensitive
    Locale: "en_US", // Your locale here, case-sensitivity depends on input
    MediaFilter: "minimal", // either minimal or basic, not case sensitive
    DateFormat: "D/MM/YYYY - H:mm:ss A", // Change this accordingly
  });

  // BOT
  function makeid(length) {
    var result = [];
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    //"0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result.push(
        characters.charAt(Math.floor(Math.random() * charactersLength))
      );
    }
    return result.join("");
  }

  // on redis connect
  redis_client.on("connect", async function () {
    // flush redis db
    redis_client.flushdb(function (err, succeeded) {
      console.log("Redis flushed: " + succeeded);
    });
  });

  // REST (Slash Commands)
  const commands = [
    new Discord.SlashCommandBuilder()
      .setName("guildconfig")
      .setDescription("Displays the current guild config.")
      .setDMPermission(false),
    new Discord.SlashCommandBuilder()
      .setName("removechannel")
      .setDMPermission(false)
      .setDefaultMemberPermissions(
        Discord.PermissionFlagsBits.KickMembers |
          Discord.PermissionFlagsBits.BanMembers
      )
      .setDescription("Removes the channel restrictions for the bot"),
    new Discord.SlashCommandBuilder()
      .setName("setchannel")
      .setDMPermission(false)
      .setDefaultMemberPermissions(
        Discord.PermissionFlagsBits.KickMembers |
          Discord.PermissionFlagsBits.BanMembers
      )
      .setDescription("Sets the channel restrictions for the bot")
      .addChannelOption((option) =>
        option.setName("channel").setDescription("Channel").setRequired(true)
      ),
    new Discord.SlashCommandBuilder()
      .setName("inventory")
      .setDescription("Commands for the inventory")
      .addSubcommand((subcommand) =>
        subcommand.setName("clear").setDescription("Clears your inventory")
      )
      .addSubcommand((subcommand) =>
        subcommand.setName("show").setDescription("Shows your inventory")
      ),
    new Discord.SlashCommandBuilder()
      .setName("stats")
      .setDMPermission(false)
      .setDescription("Displays server stats (mainly for debug info)"),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  client.on("ready", async () => {
    console.log(`BOT ONLINE: Serving ${client.guilds.cache.size} server(s)`);

    await rest.put(Discord.Routes.applicationCommands(process.env.DISCORD_ID), {
      body: commands,
    });

    console.log("Successfully registered application commands.");

    await client.user.setPresence({
      activities: [
        {
          name: `${client.guilds.cache.size} servers!`,
          type: "WATCHING",
        },
      ],
      status: "online",
    });
  });

  /**
   * So basically this is here because there's
   * this bot called twitter.com/h0nde that somehow
   * found an exploit allowing them to create a bunch of discord
   * accounts and create what is basically a worm
   */
  client.on("guildMemberAdd", (message, member) => {
    if (member.displayName.contains("twitter.com/h0nde")) {
      message.channel.send(
        ":warning: | A H0NDE HAS ENTERED THE SERVER | :warning: "
      );
      member
        .ban()
        .then((member) => {
          // Successmessage
          message.channel.send(
            ":warning: | THE H0NDE HAS BEEN REMOVED FROM THE SERVER | :warning:"
          );
        })
        .catch(() => {
          // Failmessage
          message.channel.send(
            ":exclamation: | THE H0NDE COULD NOT BE REMOVED FROM THE SERVER | :exclamation: "
          );
        });
    }
  });

  // parse messages
  message_handler.parseMessages(
    client,
    db,
    redis_client,
    tentrpg,
    flush_cache,
    makeid,
    Tenor
  );

  // parse interactions
  interaction_handler.parseInteractions(client, db, redis_client, tentrpg);

  function flush_cache(message) {
    process.stdout.write(`Flushing Cache: `);
    redis_client.DEL(message.guild.id);
  }

  client.login(process.env.TOKEN);
});

module.exports = {
  client,
};
