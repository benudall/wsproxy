// var http = require('http');
// var fs = require('fs');
// var fetch = require('node-fetch');
const { app, BrowserWindow } = require('electron');
const path = require('path');

const createWindow = () => {
	const win = new BrowserWindow({
		width: 1920,
		height: 1080,
		icon: `${__dirname}/favicon.ico`,
		// titleBarStyle: 'hidden',
		titleBarOverlay: true,
		webPreferences: {
			contextIsolation: false,
			sandbox: false,
			preload: path.join(__dirname, 'preload.js')
		}
	})
	win.loadFile('index.html')
}

app.whenReady().then(() => {
	createWindow()
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})