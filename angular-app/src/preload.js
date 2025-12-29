// angular-app/src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Безопасно предоставляем API Angular приложению
contextBridge.exposeInMainWorld('electronAPI', {
  // Библиотека
  getLibrary: () => ipcRenderer.invoke('get-library'),
  saveItem: (item) => ipcRenderer.invoke('save-item', item),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  
  // Файлы
  selectPoster: () => ipcRenderer.invoke('select-file', {
    filters: [
      { name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
      { name: 'Все файлы', extensions: ['*'] }
    ]
  }),
  
  selectPlaylist: () => ipcRenderer.invoke('select-file', {
    filters: [
      { name: 'Плейлисты', extensions: ['mpcpl', 'm3u', 'm3u8', 'pls'] },
      { name: 'Все файлы', extensions: ['*'] }
    ]
  }),
  
  // Воспроизведение
  playPlaylist: (path) => ipcRenderer.invoke('play-playlist', path),
  
  // Настройки
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setAutostart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),
  getAutostartStatus: () => ipcRenderer.invoke('get-autostart-status'),
  
  // Управление окном
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // События
  on: (channel, callback) => {
    const validChannels = ['notification', 'update-available', 'update-downloaded'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Добавляем типы для TypeScript
contextBridge.exposeInMainWorld('__ELECTRON__', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron
});