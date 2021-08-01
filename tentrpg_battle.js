const Discord = require("discord.js");
const disbut = require("discord-buttons");
const path = require("path");

const express = require("express");
const app = express();
const port = process.env.WEBAPP_PORT || 8080;

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

  message.member.user.send(
    `Waiting for a response from ${challenged_user.username}...`
  );

  challenged_user.send(
    `${message.author.username} has challenged you to a battle!`,
    row
  );
}

// WEBSERVER
// -----------------------------------------------------------------------------

const MongoClient = require("mongodb").MongoClient;
const mongo_client = new MongoClient(process.env.MONGODB_URL);

mongo_client.connect(function (mg_error) {
  db = mongo_client.db(process.env.MONGODB_DBNAME);
  const col_items = db.collection("items");

  app.set("views", path.join(__dirname, "/views"));
  app.set("view engine", "pug");
  app.use(express.static("assets"));

  app.get("/", (req, res) => {
    // fetch some items
    col_items
      .find({})
      .limit(10)
      .sort({ date_discovered: -1 })
      .toArray((err, items) => {
        if (err) {
          console.log(err);
          res.status(500).send("Error");
        }

        res.render("index", { item_db: items });
      });
  });

  app.listen(port, () => {
    console.log(
      `Battle system webserver listening at http://${process.env.WEBAPP_HOST}:${process.env.WEBAPP_PORT}`
    );
  });
});

module.exports = {
  battle,
};
