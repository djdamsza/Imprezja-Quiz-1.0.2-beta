/**
 * Preload dla ekranu prezentacji – logowanie do pliku (Electron)
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('imprezjaLog', {
    log: (location, message, data) => {
        try {
            ipcRenderer.invoke('imprezja-debug-log', { location, message, data: data || {} }).catch(() => {});
        } catch (_) {}
    }
});
