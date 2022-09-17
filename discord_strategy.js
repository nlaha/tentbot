var DiscordStrategy = require("passport-discord").Strategy;

var scopes = ["identify", "email"];

const discord_strategy = new DiscordStrategy(
  {
    clientID: process.env.DISCORD_ID,
    clientSecret: process.env.DISCORD_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK,
    scope: scopes,
  },
  function (accessToken, refreshToken, profile, cb) {
    const col_users = db.collection("users");

    col_users.findOne({ id: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
);

module.exports = discord_strategy;
