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
  } else if (button.id.includes("battle_accept")) {
    battleID = 0;
    url = `${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}/battle?battleid=${battleID}`;
  } else if (button.id.includes("battle_decline")) {
  }
}

module.exports = {
  clickButton,
};
