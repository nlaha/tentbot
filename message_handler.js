function parseMessages(
  client,
  db,
  redis_client,
  tentrpg,
  flush_cache,
  makeid,
  Tenor
) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content !== "") {
      // check if guild_config exists for this guild
      db.collection("guild_config")
        .find({ id: message.guild.id })
        .toArray(function (err, result) {
          if (err) throw err;

          if (result.length == 0) {
            // guild_config doesn't exist
            redis_client.LPUSH(message.guild.id, message.content);
          } else {
            // get channel id from the current guild_config
            if (result[0].channel_id == message.channel.id) {
              redis_client.LPUSH(message.guild.id, message.content);
            }
          }
        });

      // random chance to come across an item
      var message_chance = Math.random();

      let cache_length = await redis_client.LLEN(message.guild.id);
      // check if we've reached the cache limit
      if (cache_length !== undefined) {
        if (cache_length >= process.env.CACHE_SIZE) {
          if (message_chance < 0.5) {
            // loot drop!
            tentrpg.loot(client, message, db);
            flush_cache(message);
          } else {
            let range = await redis_client.LRANGE(message.guild.id, 0, -1);
            // pick a random message
            rand_msg =
              range[Math.floor(Math.random() * process.env.CACHE_SIZE)];

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
          }
        }
      }
    }
  });
}

// export
module.exports = {
  parseMessages,
};
