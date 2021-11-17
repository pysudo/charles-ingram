// Define configuration options
module.exports = {
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.BOT_TOKEN
    },
    channels: [
        process.env.CHANNEL_NAME
    ]
};
