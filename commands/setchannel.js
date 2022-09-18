const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Sets the channel for the bot to use.")
    .setDefaultMemberPermissions(
      Discord.PermissionFlagsBits.KickMembers |
        Discord.PermissionFlagsBits.BanMembers
    )
    .addChannelOption((option) =>
      option.setName("channel").setDescription("Channel").setRequired(true)
    ),

  async execute(interaction, mongo, redis) {
    await interaction.deferReply({ ephemeral: true });
    mongo
      .collection("guild_config")
      .updateOne(
        { id: interaction.guild.id },
        { $set: { channel: interaction.options.getChannel("channel").id } },
        { upsert: true }
      )
      .then(async (result) => {
        await interaction.editReply({
          content: `Set channel to ${
            interaction.options.getChannel("channel").name
          }.`,
          ephemeral: true,
        });
      })
      .catch(async (err) => {
        await interaction.editReply({
          content: "There was an error setting the channel.",
          ephemeral: true,
        });
      });
  },
};
