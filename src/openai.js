const { Configuration, OpenAIApi } = require('openai');

let openai;

function initialize(apiKey) {
  const configuration = new Configuration({
    apiKey: keys.openaiApiKey,
  });

  openai = new OpenAIApi(configuration);
}

async function testConnection() {
  if (!openai) {
    console.error("OpenAI API not initialized");
    return;
  }

  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: 'Hello world',
  });

  return completion.data.choices[0].text;
}

// You can add more functions here that use the OpenAI API...

module.exports = {
  initialize,
  testConnection,
  // ...and export them here.
};
