const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleAlwaysOnTop: (enabled) => ipcRenderer.send('toggle-always-on-top', enabled),
  toggleClickThrough: (enabled) => ipcRenderer.send('toggle-click-through', enabled),
  httpGet: (url) => ipcRenderer.invoke('http-get', url),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
});
