const setButton = document.getElementById("tracking");
setButton.addEventListener("click", () => {
	window.electronAPI.tracking();
});
const resetButton = document.getElementById("reset");
setButton.addEventListener("click", () => {
	window.electronAPI.reset();
});
