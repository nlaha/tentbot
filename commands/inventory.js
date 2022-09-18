const Discord = require("discord.js");

// import tentrpg
const tentrpg = require("../tentrpg.js");

module.exports = {
  data: new Discord.SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Displays the current inventory for the user.")
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand.setName("clear").setDescription("Clears your inventory")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("Shows your inventory")
    ),

  async execute(interaction, mongo, redis) {
    await interaction.deferReply();

    const col_users = mongo.collection("users");
    const col_items = mongo.collection("items");
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
        mongo
      );
    }
  },
};
