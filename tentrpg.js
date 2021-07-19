const Discord = require("discord.js");
const disbut = require("discord-buttons");
const { v4: uuidv4 } = require("uuid");
var fs = require("fs");
const deepai = require("deepai");
deepai.setApiKey("e458fdb0-bb2e-42a3-bea3-216a0a241c40");
const wiki = require("wikipedia");
var axios = require("axios").default;

async function loot(client, message, command, args, db) {
  let item = {
    id: uuidv4(),
    prefix: "",
    name: "VOID",
    powers: ["☊⍜⋏⌇⎍⋔⟒"],
    level: -500,
    thumbnail: "",
    attack: 0,
    defense: 0,
    health: 0,
    url: "",
  };

  item.prefix = get_prefix();
  //item.name = get_name();
  item.powers = get_powers();
  item.level = get_level();

  var page = null;
  try {
    page = await wiki.random("summary");
    console.log(page);

    item.name = page.title;
  } catch (err) {
    return;
  }

  item.thumbnail = page.thumbnail.source; //await get_thumbnail(`${page.extract}`);
  item.attack = get_number_stat(100);
  item.defense = get_number_stat(100);
  item.health = get_number_stat(100);
  item.url = page["content_urls"]["desktop"]["page"];

  // Get the collation
  const col_items = db.collection("items");
  // Insert the item into the collection
  await col_items.insertOne(item);

  console.log(item);

  itemEmbed = get_item_embed(item);

  let take = new disbut.MessageButton()
    .setStyle("blurple")
    .setLabel("Take")
    .setID("take" + item.id);

  await message.channel.send(itemEmbed, take);
}

function get_name() {
  return getRandomLine("./words/nouns.txt").trim();
}

function get_prefix() {
  return getRandomLine("./words/adjectives.txt").trim();
}

function get_powers() {
  return [
    getRandomLine("./words/powers.txt").trim(),
    getRandomLine("./words/powers.txt").trim(),
    getRandomLine("./words/powers.txt").trim(),
  ];
}

async function get_thumbnail(text) {
  var resp = await deepai.callStandardApi("text2img", {
    text: text,
  });
  return resp["output_url"];
}

function get_item_embed(item) {
  return new Discord.MessageEmbed()
    .setTitle(`\:interrobang: [L ${item.level}] [${item.prefix}] ${item.name}`)
    .setDescription(
      `While wandering about, you stumble upon a \`${item.name}\`, it looks very \`${item.prefix}\`.`
    )
    .addFields(
      { name: "Powers", value: item.powers.join(", ") },
      {
        name: "Attack",
        value: `${item.attack} (${item.attack * item.level})`,
        inline: true,
      },
      {
        name: "Defense",
        value: `${item.defense} (${item.defense * item.level})`,
        inline: true,
      },
      {
        name: "Health",
        value: `${item.health} (${item.health * item.level})`,
        inline: true,
      }
    )
    .setThumbnail(item.thumbnail)
    .setURL(item.url)
    .setColor(stringToColour(item.prefix));
}

function get_inventory_embed(items, message, page) {
  let embed = new Discord.MessageEmbed()
    .setTitle(`${message.member.user.username}'s Inventory`)
    .setDescription(`Page: ${page}`);

  if (items !== undefined && items.length > 0) {
    items.forEach((item) => {
      embed.addFields({
        name: `[L ${item.level}] [${item.prefix}] ${item.name}`,
        value: `A/D/H | **${item.attack * item.level}/${
          item.defense * item.level
        }/${item.health * item.level}** | [link](${item.url})\n\n\n`,
      });
    });
  } else {
    embed.addFields({
      name: "Inventory Empty",
      value: "Try collecting some items!",
    });
  }

  return embed;
}

async function get_inventory_page(page, message, userid, db, edit) {
  const col_users = db.collection("users");
  const col_items = db.collection("items");
  await col_users.findOne({ user_id: userid }, async function (err, doc) {
    if (doc) {
      const inventory = doc.user_inventory;
      await col_items
        .find({
          id: {
            $in: inventory,
          },
        })
        .skip((page - 1) * 6)
        .limit(6)
        .sort({ level: -1 })
        .toArray(async function (err, docs) {
          if (docs !== undefined && docs.length > 0) {
            let previouspage = new disbut.MessageButton()
              .setStyle("grey")
              .setLabel("Previous Page")
              .setID(`inv_previous_page_%_${userid}`);

            let nextpage = new disbut.MessageButton()
              .setStyle("grey")
              .setLabel("Next Page")
              .setID(`inv_next_page_%_${userid}`);

            if (page == 1) {
              previouspage.setDisabled(true);
            }

            let row = new disbut.MessageActionRow().addComponents(
              previouspage,
              nextpage
            );

            if (edit == true) {
              await message.edit(get_inventory_embed(docs, message, page), row);
            } else {
              await message.channel.send(
                get_inventory_embed(docs, message, page),
                row
              );
            }
          } else {
            return false;
          }
        });
    } else {
      message.reply(`You have no items in your inventory!`);
    }
  });
}

// returns a random number with
// decreasing likelihood from 1 to 300
function get_level() {
  return Math.floor(
    1 +
      ((300 - 1) *
        Math.abs(
          -2 + (Math.random() + Math.random() + Math.random() + Math.random())
        )) /
        2
  );
}

function get_number_stat(max) {
  return Math.floor(
    1 +
      ((max - 1) *
        Math.abs(
          -2 + (Math.random() + Math.random() + Math.random() + Math.random())
        )) /
        2
  );
}

function getRandomLine(filename) {
  const data = fs.readFileSync(filename, "utf8");

  // note: this assumes `data` is a string - you may need
  let lines = data.split("\n");

  // choose one of the lines...
  let line_idx = Math.floor(Math.random() * lines.length);
  let line = lines[line_idx];
  if (line.trim() === "") {
    line = lines[line_idx + 1];
  }

  return line;
}

function stringToColour(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = "#";
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
}

module.exports = {
  loot,
  get_item_embed,
  get_inventory_embed,
  get_inventory_page,
};
