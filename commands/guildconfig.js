const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("guildconfig")
    .setDescription("Displays the current guild config.")
    .setDMPermission(false),

  async execute(interaction, mongo, redis) {
    await interaction.deferReply();

    // display the current guild config
    // get the guild config from the database
    let invalid = true;
    await mongo
      .collection("guild_config")
      .findOne({ id: interaction.guild.id })
      .then(async (result) => {
        // if the guild config exists, display it as an embed
        if (result) {
          // get channel from id
          let channel = await interaction.client.channels.fetch(
            result.channel_id
          );

          if (channel) {
            await interaction.editReply({
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
      await interaction.editReply({
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
  },
};
