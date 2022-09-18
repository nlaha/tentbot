const tentrpg = require("./tentrpg.js");
const Discord = require("discord.js");

async function bindButton(interaction, id, callback) {
  if (interaction.customId.includes(id)) {
    return Promise.resolve(interaction);
  }
}

async function bindButtonInteractions(interaction, mongo) {
  // bind take button
  await interaction.deferUpdate();
  bindButton(interaction, "take").then((i) => take_btn_callback(i, mongo));
}

// take button callback
async function take_btn_callback(interaction, mongo) {
  console.log(`Giving item "${interaction.id}" to ${interaction.user}`);

  const col_users = mongo.collection("users");
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
}

module.exports = {
  bindButtonInteractions,
};
