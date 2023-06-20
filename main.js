const { app, BrowserWindow, ipcMain, protocol } = require("electron");
const path = require("path");
let win;

var OWIRobotArm = require("owi-robot-arm");

let shouldTrack = false;
let debounce = false;
var arm = new OWIRobotArm();

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
	{
		scheme: "app",
		privileges: {
			secure: true,
			standard: true,
			corsEnabled: true,
			supportFetchAPI: true,
		},
	},
]);

const createWindow = () => {
	win = new BrowserWindow({
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: true,
		},
		width: 960,
		height: 1024,
	});

	ipcMain.on("tracking", () => {
		shouldTrack = !shouldTrack;
	});

	ipcMain.on("faceReceive", (_event, data) => {
		if (!data) {
			arm.stop();
			return;
		}

		if (shouldTrack) {
			if (data.x > 0.65) {
				arm.baseClockwise();
				setTimeout(() => {
					arm.stop();
				}, 1000);
			} else if (data.x < 0.35) {
				arm.baseCounterClockwise();
				setTimeout(() => {
					arm.stop();
				}, 1000);
			} else {
				if (data.y > 0.65) {
					arm.shoulderDown();
					setTimeout(() => {
						arm.stop();
					}, 1000);
				} else if (data.y < 0.35) {
					arm.shoulderUp();
					setTimeout(() => {
						arm.stop();
					}, 1000);
				}
			}
		} else {
			arm.stop();
		}

		if (debounce) {
			return;
		}

		debounce = true;

		if (data.isSad) {
			arm.ledOn();
			setTimeout(() => {
				arm.ledOff();
				setTimeout(() => {
					arm.ledOn();
					setTimeout(() => {
						arm.ledOff();
						debounce = false;
					}, 1000);
				}, 500);
			}, 1000);
		}
		if (data.isHappy) {
			arm.gripsClose();
			setTimeout(() => {
				arm.gripsOpen();
				setTimeout(() => {
					arm.gripsClose();
					setTimeout(() => {
						arm.gripsOpen();
						setTimeout(() => {
							arm.stop();
							debounce = false;
						}, 1500);
					}, 1500);
				}, 1500);
			}, 1500);
		}

		setTimeout(() => {
			debounce = false;
		}, 3000);
	});

	ipcMain.on("reset", () => {
		win.webContents.send("startCamera");
	});
	win.loadFile("index.html");
};

app.whenReady().then(async () => {
	createWindow();
	app.on("activate", function () {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});

	win.webContents.send("startCamera");
});

app.on("window-all-closed", () => {
	arm.stop();

	if (process.platform !== "darwin") app.quit();
});
