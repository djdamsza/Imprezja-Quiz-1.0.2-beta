/**
 * Preload dla Imprezatora – natywne okna wyboru pliku/folderu (Electron)
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imprezatorNative', {
    showOpenFile: () => ipcRenderer.invoke('imprezator-open-file'),
    showOpenDirectory: () => ipcRenderer.invoke('imprezator-open-directory')
});
