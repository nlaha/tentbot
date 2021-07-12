const Discord = require("discord.js");
const disbut = require("discord-buttons");

async function battle(client, message, command, args, db, challenged_user) {
  let previouspage = new disbut.MessageButton()
    .setStyle("red")
    .setLabel("Decline")
    .setID(`battle_decline`);

  let nextpage = new disbut.MessageButton()
    .setStyle("green")
    .setLabel("Accept")
    .setID(`battle_accept`);

  let row = new disbut.MessageActionRow().addComponents(previouspage, nextpage);

  challenged_user.send(
    `${message.author.username} has challenged you to a battle!`,
    row
  );
}

module.exports = {
  battle,
};
