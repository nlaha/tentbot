// IMPORTS
const { Client, MessageEmbed } = require("discord.js");
const client = new Client();
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

const { promisify } = require("util");
const getAsync = promisify(redis_client.get).bind(redis_client);

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
  process.stdout.write(`Flushing Cache: `);
  redis_client.flushdb(function (err, reply) {
    // reply is null when the key is missing
    process.stdout.write(reply + "\n");
  });
});

// ban honde
bot.on("guildMemberAdd", (message, member) => {
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
  //if (message.author.bot) return;

  if (message.content !== "") {
    redis_client.lpush(message.guild.id, message.content);
  }

  redis_client.llen(message.guild.id, function (err, reply) {
    // check if we've reached the cache limit
    if (reply !== undefined && err == null) {
      if (reply >= process.env.CACHE_SIZE) {
        redis_client.lrange(message.guild.id, 0, -1, function (err, reply) {
          // pick a random message
          rand_msg = reply[Math.floor(Math.random() * process.env.CACHE_SIZE)];

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

          process.stdout.write(`Flushing Cache: `);
          redis_client.del(message.guild.id, function (err, reply) {
            // flush cache
            process.stdout.write(reply + "\n");
          });
        });
      }
    }
  });

  if (message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "stats") {
    return message.channel.send(`Server count: ${client.guilds.cache.size}`);
  }
});

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

client.login(process.env.TOKEN);
