const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: "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",
});

const openai = new OpenAIApi(configuration);

async function testConnection() {
    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: "Hello world",
    });
    console.log(completion.data.choices[0].text);
}

module.exports = {
    testConnection,
    openai
}

