const Discord = require("discord.js");
const disbut = require("discord-buttons");
const path = require("path");
const wiki = require("wikipedia");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");

const express = require("express");
const passport = require("passport");
const discord_strategy = require("./discord_strategy.js");

const session = require("express-session");
var cookieParser = require("cookie-parser");
const MongoStore = require("connect-mongo");

var bodyParser = require("body-parser");
const app = express();
const port = process.env.WEBAPP_PORT || 8080;

const bot = require("./bot");

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

async function battle(client, message, command, args, db, challenged_user) {
  let previouspage = new disbut.MessageButton()
    .setStyle("red")
    .setLabel("Decline")
    .setID(`battle_decline%` + message.author.id + "%" + challenged_user.id);

  let nextpage = new disbut.MessageButton()
    .setStyle("green")
    .setLabel("Accept")
    .setID(`battle_accept%` + message.author.id + "%" + challenged_user.id);

  let row = new disbut.MessageActionRow().addComponents(previouspage, nextpage);

  message.member.user.send(
    `Waiting for a response from ${challenged_user.username}...`
  );

  challenged_user.send(
    `${message.author.username} has challenged you to a battle!`,
    row
  );
}

// createBattle
async function createBattle(challenged_user, message_user, db) {
  // create a UUID for the battle
  let battle_id = uuidv4();

  // create a battle object
  let battle = {
    id: battle_id,
    challenger: message_user,
    challenged: challenged_user,
    status: "pending",
    winner: null,
    loser: null,
  };

  // add the battle to the database
  await db.collection("battles").insertOne(battle);

  // return the battle id
  return battle_id;
}

// -----------------------------------------------------------------------------
// WEBSERVER
// -----------------------------------------------------------------------------

const MongoClient = require("mongodb").MongoClient;
const mongo_client = new MongoClient(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongo_client.connect(function (err) {
  if (!err) {
    console.log("Webserver connected successfully to MongoDB server");
  } else {
    console.error("Error connecting webserver to MongoDB server: " + err);
  }

  db = mongo_client.db(process.env.MONGODB_DBNAME);
  const col_items = db.collection("items");
  const col_users = db.collection("users");
  const col_ips = db.collection("ips");
  const col_battles = db.collection("battles");

  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    session({
      secret: process.env.TOKEN,
      store: MongoStore.create({ mongoUrl: process.env.MONGODB_URL }),
      resave: true,
      saveUnitialized: true,
      rolling: true, // forces resetting of max age
      cookie: {
        maxAge: 360000,
        secure: false,
      },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use("discord", discord_strategy);

  app.set("views", path.join(__dirname, "/views"));
  app.set("view engine", "pug");
  app.use(express.static("assets"));

  app.get("/", (req, res) => {
    // fetch some items
    col_items.updateMany(
      { enchants: { $exists: false } },
      { $set: { enchants: 0 } }
    );
    col_items.updateMany(
      { curses: { $exists: false } },
      { $set: { curses: 0 } }
    );

    col_items
      .find({})
      .limit(10)
      .sort({ date_discovered: -1 })
      .toArray((err, items) => {
        if (err) {
          console.log(err);
          res.status(500).send("Error");
        }

        // if we haven't updated the user scores in the past 1 hours, call update_user_score() for each user id
        col_users.find({}).toArray((err, users) => {
          if (err) {
            console.log(err);
            res.status(500).send("Error");
          }

          let now = new Date();
          let last_updated = new Date(users[0].last_updated);
          let diff = now - last_updated;
          let diff_hours = diff / 1000 / 60 / 60;

          if (last_updated == null || diff_hours > 1) {
            users.forEach((user) => {
              update_user_stats(user.user_id);
            });
            // update the last_updated field for all users
            col_users.updateMany({}, { $set: { last_updated: now } });
          }
        });

        // get the top 10 users sorted by user_score
        col_users
          .find({})
          .limit(10)
          .sort({ user_score: -1 })
          .toArray((err, users) => {
            if (err) {
              console.log(err);
              res.status(500).send("Error");
            }

            res.render("index", { item_db: items, user_db: users });
          });
      });
  });

  app.get("/item", (req, res) => {
    let item_id = req.query.id;
    col_items.findOne({ id: item_id }, async (err, item) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error");
      }

      if (item) {
        const page = await wiki.page(item.name);
        const summary = await page.summary();
        const categories = await page.categories({ redirect: false, limit: 5 });

        res.render("item", {
          item: item,
          summary: summary,
          categories: categories,
        });
      }
    });
  });

  app.get("/user", async (req, res) => {
    let userid = req.query.id;
    let page = req.query.page;
    if (page == null) {
      // redirect
      return res.redirect(`/user?id=${userid}&page=1`);
    }
    await col_users.findOne({ user_id: userid }, async function (err, user) {
      if (user) {
        const discord_user = await bot.client.users
          .fetch(user.user_id)
          .catch(console.error);
        const discord_avatar = await discord_user.avatarURL();
        const inventory = user.user_inventory;
        await col_items
          .find({
            id: {
              $in: inventory,
            },
          })
          .skip((page - 1) * 10)
          .limit(10)
          .sort({ level: -1 })
          .toArray(async function (err, items) {
            col_users
              .aggregate([
                { $match: { user_id: userid } },
                {
                  $project: {
                    numberOfItems: {
                      $size: "$user_inventory",
                    },
                  },
                },
              ])
              .toArray()
              .then(function (result) {
                res.render("user", {
                  user_items: items,
                  user: discord_user,
                  user_avatar: discord_avatar,
                  num_items: result[0].numberOfItems,
                  page_current: page,
                  page_max: Math.ceil(result[0].numberOfItems / 10),
                });
              });
          });
      }
    });
  });

  app.get("/auth/discord", passport.authenticate("discord"));
  app.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
      failureRedirect: "/",
    }),
    function (req, res) {
      res.redirect("/"); // Successful auth
    }
  );

  app.get("/battle", (req, res) => {
    passport.authenticate("discord", {
      successReturnToOrRedirect: req.url,
      failureRedirect: "/",
    });

    // get query parameters
    let battle_id_url = req.query.id;

    // url unencode the battle id
    battle_id = decodeURIComponent(battle_id_url);

    // get the battle from the database via it's id
    col_battles.findOne({ id: battle_id }, async (err, battle) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error");
      }

      if (battle) {
        // get the users from the database via their ids
        col_users.findOne({ user_id: battle.challenger }, (err, challenger) => {
          col_users.findOne(
            { user_id: battle.challenged },
            (err, challenged) => {
              res.render("battle", {
                battle: battle,
                challenger: challenger,
                challenged: challenged,
              });
            }
          );
        });
      }
    });
  });

  // updates a single user and adds a field containing the sum of all the user's item levels
  async function update_user_stats(user_id) {
    await col_users.findOne({ user_id: user_id }, async (err, user) => {
      if (user) {
        // async get all items in user inventory
        await col_items
          .find({
            id: {
              $in: user.user_inventory,
            },
          })
          .toArray(async function (err, item_db) {
            if (err) {
              console.log(err);
              res.status(500).send("Error");
            }
            // sum up item stats
            let user_score = 0,
              user_attack = 0,
              user_defense = 0,
              user_health = 0,
              user_enchants = 0,
              user_curses = 0;

            item_db.forEach((item) => {
              user_score += item.level;
              user_attack += item.attack;
              user_defense += item.defense;
              user_health += item.health;
              user_enchants += item.enchants;
              user_curses += item.curses;
            });

            const discord_user = await bot.client.users
              .fetch(user.user_id)
              .catch(console.error);
            const discord_avatar = await discord_user.avatarURL();

            // update in database
            col_users.updateOne(
              { user_id: user_id },
              {
                $set: {
                  user_score: user_score,
                  user_attack: user_attack,
                  user_defense: user_defense,
                  user_health: user_health,
                  user_enchants: user_enchants,
                  user_curses: user_curses,
                  user_avatar: discord_avatar,
                  user_tag: discord_user.tag.split("#")[1],
                },
              }
            );
          });
      } else {
        console.log(`User ${user_id} is null when updating leaderboard`);
      }
    });
  }

  // compares two dates and returns true if the first date is 24 hours older or more
  function is_24_hours_older(date1, date2) {
    const date1_obj = new Date(date1);
    const date2_obj = new Date(date2);
    const diff = date2_obj.getTime() - date1_obj.getTime();
    return diff > 86400000;
  }

  // returns the difference between two dates in hours:minutes padding with zeros
  function get_time_diff(date1, date2) {
    const date1_obj = new Date(date1);
    const date2_obj = new Date(date2);
    let diff = date2_obj.getTime() - date1_obj.getTime();
    diff = 86400000 - diff;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff - hours * 3600000) / 60000);

    // pad to 2 digits on hours and minutes
    return `${
      hours < 10 ? "0" : ""
    }${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
  }

  // ENCHANTS
  // -----------------------------------------------------------------------------
  app.post("/enchant", jsonParser, (req, res) => {
    let item_id = req.body.id;
    const remoteIP = req.connection.remoteAddress.toString();

    col_ips.find({ ip: remoteIP }).toArray((err, ip) => {
      if (
        !ip[0] ||
        ip[0].last_enchanted == undefined ||
        is_24_hours_older(ip[0].last_enchanted, Date.now())
      ) {
        col_items.updateOne({ id: item_id }, { $inc: { enchants: 1 } });
        col_ips.updateOne(
          { ip: remoteIP },
          {
            $set: {
              ip: remoteIP,
              last_enchanted: Date.now(),
            },
          },
          { upsert: true }
        );
      } else {
        return res.send(
          `Couldn't enchant that item, please wait another ${get_time_diff(
            ip[0].last_enchanted,
            Date.now()
          )} (HH:MM)`
        );
      }

      res.send("success");
    });
  });

  // CURSES
  // -----------------------------------------------------------------------------
  app.post("/curse", jsonParser, (req, res) => {
    let item_id = req.body.id;
    const remoteIP = req.connection.remoteAddress.toString();

    col_ips.find({ ip: remoteIP }).toArray((err, ip) => {
      if (
        !ip[0] ||
        ip[0].last_curse == undefined ||
        is_24_hours_older(ip[0].last_curse, Date.now())
      ) {
        col_items.updateOne({ id: item_id }, { $inc: { curses: 1 } });
        col_ips.updateOne(
          { ip: remoteIP },
          {
            $set: {
              ip: remoteIP,
              last_curse: Date.now(),
            },
          },
          { upsert: true }
        );
      } else {
        return res.send(
          `Couldn't curse that item, please wait another ${get_time_diff(
            ip[0].last_curse,
            Date.now()
          )} (HH:MM)`
        );
      }

      res.send("success");
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
  createBattle,
};
