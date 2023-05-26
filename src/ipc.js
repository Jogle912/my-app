const { ipcRenderer } = require('electron');
const handlers = require('./ipcHandlers.js');

ipcRenderer.on('request-api-keys', handlers.handleRequestApiKeys);
ipcRenderer.on('test-connection', handlers.handleTestConnection);

// You can add more ipcRenderer.on() calls here that use the handlers from ipcHandlers.js...
