// IMPORTS
const Discord = require("discord.js");
const client = new Discord.Client();
const disbut = require("discord-buttons");
require("discord-buttons")(client);
const prefix = "!";

// REDIS
const redis = require("redis");
const redis_client = redis.createClient({
  host: process.env.REDIS_HOSTNAME,
  port: process.env.REDIS_PORT,
  user: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
});

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
  const getAsync = promisify(redis_client.get).bind(redis_client);

  // modules
  const tentrpg = require("./tentrpg.js");
  const tentrpg_battle = require("./tentrpg_battle.js");
  const button_handler = require("./button_handler.js");

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

  client.on("ready", () => {
    console.log(`BOT ONLINE: Serving ${client.guilds.cache.size} server(s)`);

    client.user.setPresence({
      activity: {
        name: `${client.guilds.cache.size} servers!`,
        type: "WATCHING",
      },
    });

    process.stdout.write(`Flushing Cache: `);
    redis_client.flushdb(function (err, reply) {
      // reply is null when the key is missing
      process.stdout.write(reply + "\n");
    });
  });

  client.on("clickButton", async (button) => {
    button_handler.clickButton(button, db);
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

  client.on("message", async (message) => {
    if (message.author.bot) return;

    if (message.content !== "") {
      // check if guild_config exists for this guild
      db.collection("guild_config")
        .find({ id: message.guild.id })
        .toArray(function (err, result) {
          if (err) throw err;

          if (result.length == 0) {
            // guild_config doesn't exist
            redis_client.lpush(message.guild.id, message.content);
          } else {
            // get channel id from the current guild_config
            if (result[0].channel_id == message.channel.id) {
              redis_client.lpush(message.guild.id, message.content);
            }
          }
        });
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "removechannel") {
      if (message.member.hasPermission("ADMINISTRATOR")) {
        db.collection("guild_config")
          .deleteOne({ id: message.guild.id })
          .then((result) => {
            message.channel.send(
              "Removed channel from the database. You can now use the bot in any channel."
            );
          })
          .catch((err) => {
            message.channel.send(
              "There was an error removing the channel from the database."
            );
          });
      } else {
        message.channel.send("You do not have permission to use this command.");
      }
    }

    if (command === "setchannel") {
      if (message.member.hasPermission("ADMINISTRATOR")) {
        console.log("Setting channel for " + message.guild.id);
        // get first arg
        const channel_id = args[0].replace("<#", "").replace(">", "");
        // log
        console.log("Channel ID: " + channel_id);

        // check if channel exists
        const channel = client.channels.cache.get(channel_id);
        if (channel) {
          // set channel
          db.collection("guild_config").updateOne(
            { id: message.guild.id },
            { $set: { id: message.guild.id, channel_id: channel_id } },
            { upsert: true }
          );

          message.channel.send(
            `:white_check_mark: | Set channel to ${channel.name}`
          );
        } else {
          message.channel.send(":x: | Channel not found");
        }
      } else {
        message.channel.send("You do not have permission to use this command.");
      }
    }

    if (command === "stats") {
      redis_client.llen(message.guild.id, async function (err, reply) {
        const statEmbed = new Discord.MessageEmbed()
          .setTitle("TentBot Stats")
          .addFields(
            {
              name: "Server Count",
              value: client.guilds.cache.size,
              inline: true,
            },
            { name: "Cache Current", value: reply, inline: true },
            { name: "Cache Max", value: process.env.CACHE_SIZE, inline: true }
          )
          .setColor("#42f566");

        return message.channel.send(statEmbed);
      });
    } else if (command === "inv" || command == "i") {
      const col_users = db.collection("users");
      const col_items = db.collection("items");
      if (args[0] === "clear") {
        await col_users.updateOne(
          {
            user_id: message.member.user.id,
            user_name: message.member.user.username,
          },
          {
            $setOnInsert: {
              user_id: message.member.user.id,
              user_name: message.member.user.username,
            },
            $set: {
              user_inventory: [],
            },
          },
          { upsert: true }
        );
        message.react("✅");
      } else {
        await tentrpg.get_inventory_page(
          1,
          message,
          message.member.user.id,
          db,
          false
        );
      }
    } else if (command === "battle") {
      if (!args[0]) {
        return message.reply(`Please use the format ${prefix}battle @user`);
      } else if (args[0]) {
        const challenged_user = getUserFromMention(args[0]);
        if (!challenged_user) {
          return message.reply(`Please use the format ${prefix}battle @user`);
        }

        // make sure user exists in the database, if not send an error
        const col_users = db.collection("users");
        const user_exists = await col_users.findOne({
          user_id: challenged_user.id,
        });
        if (!user_exists) {
          return message.reply(
            `${challenged_user.username} does not have any items in their inventory! (they need to claim some items first)`
          );
        }

        // make sure the message user is in the database, if not send an error
        const user_exists_2 = await col_users.findOne({
          user_id: message.member.user.id,
        });
        if (!user_exists_2) {
          return message.reply(
            `You do not have any items in your inventory! (you need to claim some items first)`
          );
        }

        // make sure the user isn't challenging themselves
        if (challenged_user.id === message.member.user.id) {
          return message.reply(
            `You can't challenge yourself! Please challenge someone else.`
          );
        }

        tentrpg_battle.battle(
          client,
          message,
          command,
          args,
          db,
          challenged_user
        );
      }
    }

    // random chance to come across an item
    var message_chance = Math.random();

    redis_client.llen(message.guild.id, function (err, reply) {
      // check if we've reached the cache limit
      if (reply !== undefined && err == null) {
        if (reply >= process.env.CACHE_SIZE) {
          if (message_chance < 0.5) {
            // loot drop!
            tentrpg.loot(client, message, command, args, db);
            flush_cache(message);
          } else {
            redis_client.lrange(message.guild.id, 0, -1, function (err, reply) {
              // pick a random message
              rand_msg =
                reply[Math.floor(Math.random() * process.env.CACHE_SIZE)];

              msg_words = rand_msg.split(" ");
              msg_word =
                msg_words[Math.floor(Math.random() * msg_words.length)] +
                " " +
                makeid(6);
              console.log(`Searching Tenor for ${msg_word}...`);

              Tenor.Search.Query(msg_word, "1")
                .then((Results) => {
                  Results.forEach((Post) => {
                    console.log(
                      `Item #${Post.id} (Created: ${Post.created}) @ ${Post.url}`
                    );

                    message.channel.send(Post.url);
                  });
                })
                .catch(console.error);

              flush_cache(message);
            });
          }
        }
      }
    });
  });

  function flush_cache(message) {
    process.stdout.write(`Flushing Cache: `);
    redis_client.del(message.guild.id, function (err, reply) {
      // flush cache
      process.stdout.write(reply + "\n");
    });
  }

  function getUserFromMention(mention) {
    if (!mention) return;

    if (mention.startsWith("<@") && mention.endsWith(">")) {
      mention = mention.slice(2, -1);

      if (mention.startsWith("!")) {
        mention = mention.slice(1);
      }

      return client.users.cache.get(mention);
    }
  }

  client.login(process.env.TOKEN);
});

module.exports = {
  client,
};
