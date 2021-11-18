const https = require('https');
const tmi = require("tmi.js");
const readline = require('readline');
const { stdin: input, stdout: output } = require('process');

const opts = require("./auth");


let exisitingReadlineInterfaceInstance = null;


/*
* Only a single channel can be joined at a time.
* For multiple channels, run a seperate process.
*/
const config = readline.createInterface({ input, output });
config.question("\nEnter a channel to join: ", (channel) => {
  // Create a client with our options
  const client = new tmi.client({ ...opts, channels: [channel] });

  client.on("message", function () { onMessageHandler(client, ...arguments); });
  client.on("connected", onConnectedHandler);

  client.connect()
    .then(() => config.close())
    .catch(err => {
      if (err === "Unable to connect.") {
        console.error("\nUnable to connect. Check your internet connection.\n");
      }
    });
});


async function onMessageHandler(client, target, context, msg, self) {
  // Ignore messages that are not from gazatu trivia bot
  if (process.env.TTV_ID) {
    if (context["user-id"] !== process.env.TTV_ID) return;
  }
  else if (process.env.TTV_USERNAME) {
    if (context["username"] !== process.env.TTV_USERNAME.toLowerCase()) return;
  }

  const request = msg.trim().replace(/\s\s+/g, " ").split(" ");

  const parsedTrivia = await parseTrivia(request);
  if (!parsedTrivia) { return };

  const { category, question } = parsedTrivia;

  if (exisitingReadlineInterfaceInstance) {
    exisitingReadlineInterfaceInstance.close();
  }
  const rl = readline.createInterface({ input, output });
  exisitingReadlineInterfaceInstance = rl;
  rl.question(
    `\nShould I answer the question, ${question}? Yes/No or Y/N: `,
    async (response) => {

      if (["Yes", "yes", "Y", "y"].includes(response)) {
        try {
          const triviaList = await getTriviaList(category);
          const [expectedTrivia] = triviaList
            .filter(trivia => (trivia.question === question));

          if (!expectedTrivia) {
            console.log(
              `Trivia for the question and category '${category}' ` +
              `could not be found :(`
            );
            return;
          }
          client.say(target, expectedTrivia.answer);
        }
        catch (e) {
          console.error(e);
        }
      }
      rl.close();
    });
}


function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
  console.log("\nListening for any trivia questions.");
}


/**
 * Gets all related trivia questions of a particular category
 * @param {String} category Trivia category
 * @returns {Array} List of every instance of trivia corresponding to the
 * specified category
 */
function getTriviaList(category) {
  return new Promise((resolve, reject) => {
    const url = `https://api.gazatu.xyz/trivia/questions?include=[${category}]`;
    https.get(url, (response) => {
      response.setEncoding('utf8');

      let rawData = "";

      response.on('data', (chunk) => {
        rawData += chunk;
      });
      response.on('end', () => {
        resolve(JSON.parse(rawData));
      });
      response.on('error', function (err) {
        reject(err.message);
      });
    });
  })
};


/**
 * Parse and extract the current trivia category and the corresponding question.
 * @param {Array} request - Array of Gazatu trivia.
 * @returns {Object} Object literal containing current trivia category and its
 * corresponding question.
 * @example 
 * <caption>An example of a passed request.</caption> 
 * ```
 * ['1/3', 'category:', 'Pepega', ':)', 'question:', 'Shanghai', 'Pudong', 
 * 'International', 'Airport', 'is', 'an', 'airport', 'in', 'which', 
 * 'municipality?', 'Pepega']
 * ```
 */
function parseTrivia(request) {
  return new Promise((resolve) => {
    if (
      request.length < 2
      || !request[0].match(/^\d+\/\d+$/)
      || request[1] !== "category:"
    ) { resolve(false) }

    const category = request
      .splice(request.indexOf("category:"), request.indexOf(":)") - 1);
    category.splice(0, category.indexOf("category:") + 1);

    const question = request.splice(request.indexOf("question:") + 1);

    resolve({ category: category.join(" "), question: question.join(" ") });
  });
}
