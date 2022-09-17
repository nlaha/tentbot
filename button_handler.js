const tentrpg = require("./tentrpg.js");
const Discord = require("discord.js");

async function bindButtonInteractions(interaction, db) {
  if (interaction.customId.includes("take")) {
    console.log(`Giving item "${interaction.id}" to ${interaction.user}`);
    await interaction.deferUpdate();

    const col_users = db.collection("users");
    await col_users.updateOne(
      {
        user_id: interaction.user.id,
        user_name: interaction.user.username,
      },
      {
        $setOnInsert: {
          user_id: interaction.user.id,
          user_name: interaction.user.username,
        },
        $addToSet: {
          user_inventory: interaction.id.replace("take", ""),
        },
      },
      { upsert: true }
    );

    let take_disabled = new Discord.ButtonBuilder()
      .setStyle(Discord.ButtonStyle.Secondary)
      .setLabel(`Item owned by ${interaction.user.username}`)
      .setDisabled(true)
      .setCustomId("disabled");

    let row = new Discord.ActionRowBuilder().addComponents(take_disabled);

    await interaction.editReply({
      embeds: [interaction.message.embeds[0]],
      components: [row],
    });
  } else if (
    interaction.customId.includes("page") &&
    interaction.customId.includes("inv")
  ) {
    // check if interaction has been aknowledged
    try {
      await interaction.deferUpdate();
    } catch (error) {}

    // handles page changing in the inventory
    // get the current page from the message description
    var current_page = Number.parseInt(
      interaction.message.embeds[0].description.match(/\d+/)[0]
    );

    if (interaction.customId.includes("next")) {
      current_page += 1;
    } else if (interaction.customId.includes("previous")) {
      current_page -= 1;
    }

    let status = await tentrpg.get_inventory_page(
      current_page,
      interaction,
      interaction.customId.substring(interaction.customId.indexOf("_%_") + 3),
      db,
      true
    );
  }
}

module.exports = {
  bindButtonInteractions,
};
