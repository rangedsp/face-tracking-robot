const { contextBridge, ipcRenderer } = require("electron");
const faceapi = require("face-api.js");

// init detection options
const minConfidenceFace = 0.5;
const faceapiOptions = new faceapi.SsdMobilenetv1Options({ minConfidenceFace });

// cam reference
let cam;
let isRunning = true;

// configure face API
faceapi.env.monkeyPatch({
	Canvas: HTMLCanvasElement,
	Image: HTMLImageElement,
	ImageData: ImageData,
	Video: HTMLVideoElement,
	createCanvasElement: () => document.createElement("canvas"),
	createImageElement: () => document.createElement("img"),
});

const loadNet = async () => {
	const detectionNet = faceapi.nets.ssdMobilenetv1;
	await detectionNet.load("./weights");
	await faceapi.loadFaceExpressionModel("./weights");
};

const initCamera = async (width, height) => {
	const video = document.getElementById("cam");
	video.width = width;
	video.height = height;

	const stream = await navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			facingMode: "user",
			width: width,
			height: height,
		},
	});
	video.srcObject = stream;

	return new Promise((resolve) => {
		video.onloadedmetadata = () => {
			resolve(video);
		};
	});
};

const detectExpressions = async () => {
	let result = await faceapi
		.detectSingleFace(cam, faceapiOptions)
		.withFaceExpressions();

	if (result && result.detection) {
		let happiness = 0,
			sad = 0,
			anger = 0;

		if (result.expressions.hasOwnProperty("happy")) {
			happiness = result.expressions.happy;
		}
		if (result.expressions.hasOwnProperty("angry")) {
			anger = result.expressions.angry;
		}
		if (result.expressions.hasOwnProperty("sad")) {
			sad = result.expressions.sad;
		}

		if (happiness > 0.7) {
			console.log("happy");
		} else if (anger > 0.7) {
			console.log("angry");
		}

		const relativeBox = result.detection.relativeBox;
		let y = (relativeBox.top + relativeBox.bottom) / 2;
		let x = (relativeBox.left + relativeBox.right) / 2;
		document.getElementById("x").innerHTML = x;
		document.getElementById("y").innerHTML = y;
		const emotion = {
			x,
			y,
			isSad: sad > 0.7,
			isAngry: anger > 0.7,
			isHappy: happiness > 0.7,
		};
		ipcRenderer.send("faceReceive", emotion);

		document.getElementById("emo").innerHTML = `<div>
        ${Object.keys(result.expressions).map((expression) => {
					return `<div>${expression}: ${result.expressions[expression]}</div>`;
				})}
        </div>`;
	} else {
		ipcRenderer.send("faceReceive", null);
	}

	if (isRunning) {
		detectExpressions();
	}
};

contextBridge.exposeInMainWorld("electronAPI", {
	tracking: (title) => ipcRenderer.send("tracking", title),
	reset: () => ipcRenderer.send("reset"),
});

ipcRenderer.on("startCamera", async () => {
	console.log("render, start camera");

	await loadNet();
	console.log("Network has loaded");
	const video = await initCamera(640, 480);
	console.log("Camera was initialized");
	cam = video;
	detectExpressions();
});
