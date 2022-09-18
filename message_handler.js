// import tentrpg
const tentrpg = require("./tentrpg.js");

// import discordjs
const Discord = require("discord.js");

function parseMessages(client, mongo, redis, tenor) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content !== "") {
      // check if guild_config exists for this guild
      mongo
        .collection("guild_config")
        .find({ id: message.guild.id })
        .toArray(function (err, result) {
          if (err) throw err;

          if (result.length == 0) {
            // guild_config doesn't exist
            redis.LPUSH(message.guild.id, message.content);
          } else {
            // get channel id from the current guild_config
            if (result[0].channel_id == message.channel.id) {
              redis.LPUSH(message.guild.id, message.content);
            }
          }
        });

      // random chance to come across an item
      var message_chance = Math.random();

      let cache_length = await redis.LLEN(message.guild.id);
      // check if we've reached the cache limit
      if (cache_length !== undefined) {
        if (cache_length >= process.env.CACHE_SIZE) {
          if (message_chance < 0.5) {
            // loot drop!
            tentrpg.loot(client, message, mongo);
            flush_cache(redis, message);
          } else {
            let range = await redis.LRANGE(message.guild.id, 0, -1);
            // pick a random message
            rand_msg =
              range[Math.floor(Math.random() * process.env.CACHE_SIZE)];

            msg_words = rand_msg.split(" ");
            msg_word =
              msg_words[Math.floor(Math.random() * msg_words.length)] +
              " " +
              makeid(6);
            console.log(`Searching tenor for ${msg_word}...`);

            tenor.Search.Query(msg_word, "1")
              .then((Results) => {
                Results.forEach((Post) => {
                  console.log(
                    `Item #${Post.id} (Created: ${Post.created}) @ ${Post.url}`
                  );

                  message.channel.send(Post.url);
                });
              })
              .catch(console.error);

            flush_cache(redis, message);
          }
        }
      }
    }
  });
}

function flush_cache(redis, message) {
  process.stdout.write(`Flushing Cache: `);
  redis.DEL(message.guild.id);
}

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

// export
module.exports = {
  parseMessages,
};
