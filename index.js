require("dotenv").config({ path: "./config.txt" });
const { stdin } = require('process');

if (!process.env.TTV_ID && !process.env.TTV_USERNAME) {
    // If no username or ID is specified in env vars
    console.log(
        "\nSpecify either bot's username or ID or both in the config.txt file."
    );
    stdin._read();
    stdin.on("data", () => {
        process.exit();
    })
}
else require("./trivia");