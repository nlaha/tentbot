module.exports = {
  name: "ready",
  once: true,
  async execute(client, mongo, redis) {
    console.log(`${client.user.username} is online!`);

    let num_items = await mongo.collection("items").countDocuments();

    await client.user.setPresence({
      activities: [{ name: `with ${num_items} items!` }],
      status: "online",
    });
  },
};
