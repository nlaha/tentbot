const { REST } = require("@discordjs/rest");
const Discord = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

// ONLY RUN WHEN COMMANDS HAVE CHANGED

// REST (Slash Commands)
let commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

rest.put(Discord.Routes.applicationCommands(process.env.DISCORD_ID), {
  body: commands,
});

console.log("Successfully registered application commands.");
