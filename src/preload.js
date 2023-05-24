const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  require: (module) => {
    if (module === 'events') {
      return require('events');
    }
    throw new Error(`Cannot require module: ${module}`);
  },
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
});

