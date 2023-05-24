require('dotenv').config();
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const { ipcMain } = require('electron');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:8080');

  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('request-api-keys', (event) => {
    event.sender.send('response-api-keys', {
      openaiApiKey: process.env.OPENAI_API_KEY,
      canvasApiKey: process.env.CANVAS_API_KEY,
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
