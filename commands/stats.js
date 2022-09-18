const Discord = require("discord.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("stats")
    .setDescription("Displays the current stats for the bot.")
    .setDMPermission(false),

  async execute(interaction, mongo, redis) {
    await interaction.deferReply({ ephemeral: true });

    let cache_length = await redis.LLEN(interaction.guild.id);
    const statEmbed = new Discord.EmbedBuilder()
      .setTitle("Stats")
      .setDescription(`Loot drop cache stats:`)
      .setColor("#0099ff")
      .addFields({
        name: "Cache / Cache Max",
        value: `${cache_length} / ${process.env.CACHE_SIZE}`,
        inline: true,
      });

    await interaction.editReply({
      embeds: [statEmbed],
      ephemeral: true,
    });
  },
};
