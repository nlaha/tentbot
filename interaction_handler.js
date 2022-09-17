const button_handler = require("./button_handler.js");
// discord js
const Discord = require("discord.js");

function parseInteractions(client, db, redis_client, tentrpg) {
  client.on("interactionCreate", async (interaction) => {
    // handle button events
    if (interaction.isButton()) {
      button_handler.bindButtonInteractions(interaction, db);
    }

    if (!interaction.isChatInputCommand()) return;
    const command = interaction.commandName;

    if (command === "guildconfig") {
      // display the current guild config
      // get the guild config from the database
      let invalid = true;
      await db
        .collection("guild_config")
        .findOne({ id: interaction.guild.id })
        .then(async (result) => {
          // if the guild config exists, display it as an embed
          if (result) {
            // get channel from id
            let channel = await client.channels.fetch(result.channel_id);

            if (channel) {
              await interaction.reply({
                embeds: [
                  new Discord.EmbedBuilder()
                    .setColor("#0099ff")
                    .setTitle("Guild Config")
                    .setDescription(
                      `Channel ${channel.name} is the current channel for the bot.`
                    ),
                ],
              });
              invalid = false;
            }
          }
        });

      if (invalid) {
        await interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setColor("#0099ff")
              .setTitle("Guild Config")
              .setDescription(
                "No channel has been set for this guild. Use /setchannel to set one."
              ),
          ],
        });
      }
    }

    if (command === "removechannel") {
      db.collection("guild_config")
        .deleteOne({ id: interaction.guild.id })
        .then(async (result) => {
          await interaction.reply({
            content:
              "Removed channel from the database. You can now use the bot in any channel.",
            ephemeral: true,
          });
        })
        .catch(async (err) => {
          await interaction.reply({
            content:
              "There was an error removing the channel from the database.",
            ephemeral: true,
          });
        });
    }

    if (command === "setchannel") {
      console.log("Setting channel for " + interaction.guild.id);
      const channel = interaction.options.getChannel("channel");

      // check if channel exists
      if (channel) {
        // set channel
        db.collection("guild_config").updateOne(
          { id: interaction.guild.id },
          { $set: { id: interaction.guild.id, channel_id: channel.id } },
          { upsert: true }
        );

        await interaction.reply({
          content: `:white_check_mark: | Set channel to ${channel.name}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: ":x: | Channel not found",
          ephemeral: true,
        });
      }
    }

    if (command === "stats") {
      let reply = await redis_client.LLEN(interaction.guild.id);
      const statEmbed = new Discord.EmbedBuilder()
        .setTitle("Stats")
        .setDescription(`There are currently ${reply} messages in the cache.`)
        .setColor("#0099ff")
        .addFields({
          name: "Cache Size",
          value: process.env.CACHE_SIZE,
          inline: true,
        });

      return await interaction.reply({ embeds: [statEmbed], ephemeral: true });
    }

    if (command === "inventory") {
      const col_users = db.collection("users");
      const col_items = db.collection("items");
      if (interaction.options.getSubcommand() === "clear") {
        await col_users.updateOne(
          {
            user_id: interaction.member.user.id,
            user_name: interaction.member.user.username,
          },
          {
            $setOnInsert: {
              user_id: interaction.member.user.id,
              user_name: interaction.member.user.username,
            },
            $set: {
              user_inventory: [],
            },
          },
          { upsert: true }
        );
        interaction.react("✅");
      }

      if (interaction.options.getSubcommand() === "show") {
        await tentrpg.get_inventory_page(
          1,
          interaction,
          interaction.member.user.id,
          db,
          false
        );
      }
    }
  });
}

// export
module.exports = {
  parseInteractions,
};
