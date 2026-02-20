const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    platform: process.platform,
    fetchNightcafe: (url) => ipcRenderer.invoke('fetch-nightcafe', url),
});

contextBridge.exposeInMainWorld('isElectron', true);