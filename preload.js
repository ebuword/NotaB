const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notab', {
    hideWindow: () => ipcRenderer.send('hide-window'),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    onWindowShown: (callback) => ipcRenderer.on('window-shown', callback),
    onWindowHidden: (callback) => ipcRenderer.on('window-hidden', callback),
    searchApps: (query) => ipcRenderer.invoke('search-apps', query),
    openApp: (appPath) => ipcRenderer.send('open-app', appPath),
    copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
    fetchUrlMeta: (url) => ipcRenderer.invoke('fetch-url-meta', url),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    showUpdateDialog: () => ipcRenderer.send('show-update-dialog'),
});
