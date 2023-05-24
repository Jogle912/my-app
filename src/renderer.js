import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom';
import generateText, { testConnection } from './openai';

function App() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const generatedText = await generateText(input);
    setResponse(generatedText);
  }

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} />
        <button type="submit">Generate Text</button>
      </form>
      <p>{response}</p>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Could not find root element to mount to.");
}
