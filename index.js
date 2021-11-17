require("dotenv").config();
const https = require('https');
const tmi = require("tmi.js");

const opts = require("./config");


// Create a client with our options
const client = new tmi.client(opts);

try {
  client.on("message", onMessageHandler);
  client.on("connected", onConnectedHandler);

  client.connect();
}
catch (err) { console.error(err); }


async function onMessageHandler(target, context, msg, self) {
  // Ignore messages that are not from gazatu trivia bot
  if (context["user-id"] !== process.env.ID) { return; }

  const request = msg.trim().replace(/\s\s+/g, " ").split(" ");

  const parsedRequest = parseRequest(request);
  if (!parsedRequest) { return };

  const { category, question } = parsedRequest;
  try {
    const triviaList = await trivia(category);

    const [expectedTrivia] = triviaList
      .filter(trivia => (trivia.question === question.join(" ")));
    client.say(target, expectedTrivia.answer);
  }
  catch (e) {
    console.error(e);
  }
}


function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}


/**
 * 
 * @param {String} category 
 * @returns {Array}
 */
function trivia(category) {
  return new Promise((resolve, reject) => {
    const url = `https://api.gazatu.xyz/trivia/questions?include=[${category}]`;
    https.get(url, (res) => {

      res.setEncoding('utf8');
      let rawData = "";
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        resolve(JSON.parse(rawData));
      });
      res.on('error', function (e) {
        reject(e.message);
      });
    });
  })
};


/**
 * 
 * @param {Array} request - Array of Gazatu trivia 
 * @example 
 * `request:` 
 * ```
 * ['1/3', 'category:', 'Pepega', ':)', 'question:', 'Shanghai', 'Pudong', 
 * 'International', 'Airport', 'is', 'an', 'airport', 'in', 'which', 
 * 'municipality?', 'Pepega']
 * ```
 */
function parseRequest(request) {
  if (
    request.length < 2
    || !request[0].match(/^\d+\/\d+$/)
    || request[1] !== "category:"
  ) { return }

  const question = request.splice(request.indexOf("category:") + 2);
  question.splice(0, question.indexOf("question:") + 1);

  const category = request.splice(request.indexOf("category:") + 1);

  return { category, question };
}
