const openai = require('./openai');

function handleRequestApiKeys(event, keys) {  
  openai.initialize(keys.openaiApiKey);  
  event.reply('api-keys-loaded');  
}

async function handleTestConnection() {
  try {
    const result = await openai.testConnection();
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = {
  handleRequestApiKeys,
  handleTestConnection,
};
