const { ipcRenderer } = require('electron');
const { Configuration, OpenAIApi } = require('openai');

let openai;

ipcRenderer.send('request-api-keys');

ipcRenderer.on('response-api-keys', (event, keys) => {
  const configuration = new Configuration({
    apiKey: keys.openaiApiKey,
  });

  openai = new OpenAIApi(configuration);

  // You can now use `openai` to make API calls...
});

async function testConnection() {
  if (!openai) {
    console.error("OpenAI API not initialized");
    return;
  }
  
  const completion = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: 'Hello world',
  });

  console.log(completion.data.choices[0].text);
}

module.exports = {
  testConnection,
  openai
};
