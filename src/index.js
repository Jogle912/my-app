require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { handleRequestApiKeys, handleTestConnection } = require('./ipcHandlers'); // Assuming this is the correct path to your ipcHandlers.js

let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js') // Assuming you have a preload script
    },
  });

  mainWindow.loadURL('http://localhost:8080');

  mainWindow.webContents.openDevTools();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('request-api-keys', (event, keys) => {
  handleRequestApiKeys(event, keys);
});

ipcMain.on('test-connection', async (event) => {
  const result = await handleTestConnection();
  event.reply('test-connection-result', result);
});
