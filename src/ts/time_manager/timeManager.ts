import { getTotalReplayTicks, getWinningTeamFormatted } from '../replay_loader/replayLoader.js';

const playButton = document.getElementById('play-pause-button') as HTMLButtonElement;

const nextTickButton = document.getElementById('next-tick-button') as HTMLButtonElement;
const prevTickButton = document.getElementById('prev-tick-button') as HTMLButtonElement;

const skipStartButton = document.getElementById('skip-start-button') as HTMLButtonElement;
const skipEndButton = document.getElementById('skip-end-button') as HTMLButtonElement;

const tickTimelineSlider = document.getElementById('tick-timeline-slider') as HTMLInputElement;
const tickTimelineNumberInput = document.getElementById('tick-timeline-number-input') as HTMLInputElement;

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedNumberInput = document.getElementById('speed-number-input') as HTMLInputElement;
const speedDownButton = document.getElementById('speed-down-button') as HTMLButtonElement;
const speedUpButton = document.getElementById('speed-up-button') as HTMLButtonElement;

const winnerDisplay = document.getElementById('win-display-box') as HTMLDivElement;

// consts

const minSpeed = 0.5;
const maxSpeed = 20;
const speedIncrement = 0.5;

// Time Tracking Variables

export type tickData = {
	tick: number;
	tickProgress: number; // Fractional progress through current action (0–1)
};

let playing: boolean = false;
let tick: number = 0;
let speedApS: number = 3; // Actions per Second

// Live playback state
let lastTimestamp: number | null = null;
let tickProgress: number = 0; // Fractional progress through current action (0–1)

// Helper functions

function getTotalTicks(): number {
	return getTotalReplayTicks();
}

function setTick(tickValue: number) {
	tick = tickValue;
	tickTimelineSlider.value = tick.toString();
	tickTimelineNumberInput.value = tick.toString();
}
function setPlaying(isPlaying: boolean) {
	playing = isPlaying;
	const playPauseIcon = document.getElementById('playPauseIcon') as HTMLImageElement;
	if (playPauseIcon) {
		playPauseIcon.src = playing ? '/assets/ui-svgs/pause.svg' : '/assets/ui-svgs/play.svg';
	}
}

// External Functions

export async function setupTimeManager() {
	tickTimelineSlider.max = (getTotalTicks() - 1).toString();
	tickTimelineNumberInput.max = (getTotalTicks() - 1).toString();
	setTick(0);

	// Setup event listeners

	playButton.addEventListener('click', () => {
		setPlaying(!playing);
		if (playing) {
			lastTimestamp = Date.now(); // Start timing immediately
		} else {
			lastTimestamp = null; // Stop timing
		}
	});

	nextTickButton.addEventListener('click', () => {
		if (tick < getTotalTicks() - 1) {
			setTick(tick + 1);
			tickProgress = 0;
		}
	});
	prevTickButton.addEventListener('click', () => {
		if (tick > 0) {
			setTick(tick - 1);
			tickProgress = 0;
		}
	});

	skipStartButton.addEventListener('click', () => {
		setTick(0);
		tickProgress = 0;
	});
	skipEndButton.addEventListener('click', () => {
		const totalTicks = getTotalTicks();
		if (totalTicks > 0) {
			setTick(totalTicks - 1);
		}
		tickProgress = 1;
	});

	tickTimelineSlider.addEventListener('input', () => {
		setTick(parseInt(tickTimelineSlider.value, 10));
	});
	tickTimelineNumberInput.addEventListener('input', () => {
		const value = parseInt(tickTimelineNumberInput.value, 10);
		if (!Number.isNaN(value) && value >= 0 && value < getTotalTicks()) {
			setTick(value);
		}
	});

	speedSlider.addEventListener('input', () => {
		const value = parseFloat(speedSlider.value);
		if (!Number.isNaN(value) && value > 0) {
			speedApS = value;
			speedNumberInput.value = speedApS.toString();
		}
	});
	speedNumberInput.addEventListener('input', () => {
		const value = parseFloat(speedNumberInput.value);
		if (!Number.isNaN(value) && value > 0) {
			speedApS = value;
			speedSlider.value = speedApS.toString();
		}
	});
	speedUpButton.addEventListener('click', () => {
		if (speedApS < maxSpeed) {
			speedApS += speedIncrement;
			speedNumberInput.value = speedApS.toString();
			speedSlider.value = speedApS.toString();
		}
	});
	speedDownButton.addEventListener('click', () => {
		if (speedApS > minSpeed) {
			speedApS -= speedIncrement;
			speedNumberInput.value = speedApS.toString();
			speedSlider.value = speedApS.toString();
		}
	});

	function adjustSpeed(delta: number) {
		const newSpeed = Math.min(20, Math.max(1, speedApS + delta));
		speedNumberInput.value = newSpeed.toString();
		speedSlider.value = newSpeed.toString();
		speedApS = newSpeed;
	}

	const keyBindings: Record<string, { action: () => void; button?: HTMLButtonElement }> = {
		' ': { action: () => playButton.click(), button: playButton },
		r: { action: () => skipStartButton.click(), button: skipStartButton },
		s: { action: () => skipStartButton.click(), button: skipStartButton },
		e: { action: () => skipEndButton.click(), button: skipEndButton },
		ArrowRight: { action: () => nextTickButton.click(), button: nextTickButton },
		ArrowLeft: { action: () => prevTickButton.click(), button: prevTickButton },
		ArrowUp: { action: () => adjustSpeed(+0.5), button: speedUpButton },
		ArrowDown: { action: () => adjustSpeed(-0.5), button: speedDownButton },
	};

	window.addEventListener('keydown', (event) => {
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		if (['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) return;

		const binding = keyBindings[event.key];
		if (!binding) return;

		if (binding.button) {
			binding.button.classList.add('active');
			setTimeout(() => binding.button!.classList.remove('active'), 100);
		}

		binding.action();
		event.preventDefault();
	});
}

export function getCurrentTickData(): tickData {
	if (winnerDisplay) {
		if (tick == getTotalReplayTicks() - 1) {
			document.querySelectorAll<HTMLElement>('.win-display').forEach((elem) => (elem.style.display = 'block'));
		} else {
			document.querySelectorAll<HTMLElement>('.win-display').forEach((elem) => (elem.style.display = 'none'));
		}
	}

	const now = Date.now();
	if (!playing) {
		lastTimestamp = null;
		return { tick, tickProgress };
	}
	if (lastTimestamp === null) {
		lastTimestamp = now;
		return { tick, tickProgress };
	}
	const dt = (now - lastTimestamp) / 1000; // seconds elapsed
	lastTimestamp = now;
	const delta = dt * speedApS * (playing ? 1 : 0);
	tickProgress += delta;

	if (tickProgress > 1) {
		if (tick < getTotalTicks() - 1) {
			const newTick = Math.min(tick + Math.floor(tickProgress), getTotalTicks() - 1);
			setTick(newTick);
			tickProgress = tickProgress % 1;
		} else {
			setPlaying(false);
			tickProgress = 1;
		}
	}

	return { tick, tickProgress };
}

export function resetTimeManager() {
	setTick(0);
	lastTimestamp = null;
	tickProgress = 0;
	tickTimelineSlider.max = (getTotalTicks() - 1).toString();
	tickTimelineSlider.value = '0';
	tickTimelineNumberInput.max = (getTotalTicks() - 1).toString();
	tickTimelineNumberInput.value = '0';
}
