const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("removechannel")
    .setDMPermission(false)
    .setDefaultMemberPermissions(
      Discord.PermissionFlagsBits.KickMembers |
        Discord.PermissionFlagsBits.BanMembers
    )
    .setDescription("Removes the channel restrictions for the bot"),

  async execute(interaction, mongo, redis) {
    await interaction.deferReply({ ephemeral: true });
    mongo
      .collection("guild_config")
      .deleteOne({ id: interaction.guild.id })
      .then(async (result) => {
        await interaction.editReply({
          content:
            "Removed channel from the database. You can now use the bot in any channel.",
          ephemeral: true,
        });
      })
      .catch(async (err) => {
        await interaction.editReply({
          content: "There was an error removing the channel from the database.",
          ephemeral: true,
        });
      });
  },
};
