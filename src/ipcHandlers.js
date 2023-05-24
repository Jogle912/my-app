const openai = require('./openai');

function handleRequestApiKeys(event, keys) {
  openai.initialize(keys.openaiApiKey);
}

async function handleTestConnection(event) {
  const result = await openai.testConnection();
  event.reply('test-connection-result', result);
}

// You can add more handlers here that handle different IPC messages...

module.exports = {
  handleRequestApiKeys,
  handleTestConnection,
  // ...and export them here.
};