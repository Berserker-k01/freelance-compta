const { app, BrowserWindow } = require('electron');

// Ce fichier est l'entrée d'Electron. Il charge simplement votre application hébergée.
// En SaaS, c'est l'approche la plus souple: le client a un "Logiciel", 
// mais vous pouvez mettre à jour le serveur sans qu'il ait à re-télécharger l'exe.

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "Auditia - Expert Comptable SaaS",
        // icon: __dirname + '/public/favicon.ico', // Optionnel : Votre icône
        autoHideMenuBar: true, // Cache la barre de menu (Fichier, Edition...)
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    // URL DE PRODUCTION: Modifiez cette ligne quand votre VPS sera en ligne
    // win.loadURL('https://votre-domaine-auditia.com/login');

    // URL DE DÉVELOPPEMENT LOCAL (Par défaut pour tester)
    win.loadURL('http://localhost:3000/login');

    // Enlève le menu
    win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

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
