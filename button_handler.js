const tentrpg = require("./tentrpg.js");
const tentrpg_battle = require("./tentrpg_battle.js");
const Discord = require("discord.js");
const disbut = require("discord-buttons");

async function clickButton(button, db) {
  if (button.id.includes("take")) {
    console.log(
      `Giving item "${button.id}" to ${button.clicker.user.username}`
    );

    const col_users = db.collection("users");
    await col_users.updateOne(
      {
        user_id: button.clicker.user.id,
        user_name: button.clicker.user.username,
      },
      {
        $setOnInsert: {
          user_id: button.clicker.user.id,
          user_name: button.clicker.user.username,
        },
        $addToSet: {
          user_inventory: button.id.replace("take", ""),
        },
      },
      { upsert: true }
    );

    let take_disabled = new disbut.MessageButton()
      .setStyle("grey")
      .setLabel(`Item owned by ${button.clicker.user.username}`)
      .setDisabled(true)
      .setID("disabled");

    await button.message.edit(button.message.embeds[0], take_disabled);

    button.reply.defer("");
  } else if (button.id.includes("battle_accept")) {
    // accept

    // get users from button id
    const challenged_user_id = button.id.split("%")[2];
    const message_user_id = button.id.split("%")[1];

    battleID = await tentrpg_battle.createBattle(
      challenged_user_id,
      message_user_id,
      db
    );

    // urlencode battle id
    const battle_id_url = encodeURIComponent(battleID);

    url = `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}/battle?id=${battle_id_url}`;

    // send a message to both users to let them know the battle is starting
    const message_accepted = new Discord.MessageEmbed()
      .setTitle("Battle Starting!")
      .setDescription(
        `Let the battle begin! Click this link to join the battle: [${url}](${url})`
      )
      .setColor("#00ff00");

    // get discord users from challengee and challenger
    const message_user = await button.message.client.users.fetch(
      message_user_id
    );
    const challenged_user = await button.message.client.users.fetch(
      challenged_user_id
    );

    await message_user.send(message_accepted);
    await challenged_user.send(message_accepted);

    button.reply.defer("");
  } else if (button.id.includes("battle_decline")) {
    // decline

    // get users from button id
    const challenged_user_id = button.id.split("%")[2];
    const message_user_id = button.id.split("%")[1];

    // send a message to both users saying the battle was declined
    const message_declined = new Discord.MessageEmbed()
      .setTitle("Battle Declined")
      .setDescription(
        `${button.clicker.user.username} has declined the battle!`
      )
      .setColor("#ff0000");

    // get discord users from challengee and challenger
    const message_user = await button.message.client.users.fetch(
      message_user_id
    );
    const challenged_user = await button.message.client.users.fetch(
      challenged_user_id
    );

    await message_user.send(message_declined);
    await challenged_user.send(message_declined);

    // delete the battle message
    await button.message.delete();
  } else if (button.id.includes("page") && button.id.includes("inv")) {
    // handles page changing in the inventory
    // get the current page from the message description
    var current_page = Number.parseInt(
      button.message.embeds[0].description.match(/\d+/)[0]
    );

    if (button.id.includes("next")) {
      current_page += 1;
    } else if (button.id.includes("previous")) {
      current_page -= 1;
    }

    let status = await tentrpg.get_inventory_page(
      current_page,
      button.message,
      button.id.substring(button.id.indexOf("_%_") + 3),
      db,
      true
    );

    button.reply.defer("");
  }
}

module.exports = {
  clickButton,
};
