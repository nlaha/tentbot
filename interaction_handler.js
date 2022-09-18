const button_handler = require("./button_handler.js");
// discord js
const Discord = require("discord.js");

function parseInteractions(client, mongo, redis) {
  client.on("interactionCreate", async (interaction) => {
    // handle button events
    if (interaction.isButton()) {
      button_handler.bindButtonInteractions(interaction, mongo);
      return;
    }

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction, mongo, redis);
    } catch (error) {
      console.error(error);
      try {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } catch (error) {}
    }
  });
}

// export
module.exports = {
  parseInteractions,
};
