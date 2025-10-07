const audioInput = document.getElementById('audio-file');
const audioEl = document.getElementById('audio-source');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const canvas = document.getElementById('visualizer-canvas');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const ctx = canvas.getContext('2d');
const sensitivitySlider = document.getElementById('sensitivity-slider');
const sensitivityValue = document.getElementById('sensitivity-value');
const lineWidthSlider = document.getElementById('line-width-slider');
const lineWidthValue = document.getElementById('line-width-value');
const fftSizeSelect = document.getElementById('fft-size');
const smoothingSlider = document.getElementById('smoothing-slider');
const smoothingValue = document.getElementById('smoothing-value');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const progressSlider = document.getElementById('progress-slider');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const downloadBtn = document.getElementById('download-btn');
const modeButtons = [
  document.getElementById('mode-waveform'),
  document.getElementById('mode-spectrum'),
  document.getElementById('mode-spectrogram'),
];

// Web Audio API globals
let audioCtx;
let analyser;
let source;
let dataArray;
let frameId = null;
let animationMode = 'waveform';

// Initialize dragging flag
progressSlider.isDragging = false;

// Helper: format time
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Resize canvas
const resizeCanvas = () => {
  const rect = canvas.parentNode.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
};

// Setup audio & analyser
const setupAudio = (fftSize = 4096, smoothing = 0.95) => {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API failed to initialize:", e);
      overlayText.textContent = "Error: Web Audio API failed to initialize.";
      return;
    }
  }

  if (!analyser) {
    analyser = audioCtx.createAnalyser();
  }

  const newFft = parseInt(fftSize, 10);
  if (analyser.fftSize !== newFft) {
    analyser.fftSize = newFft;
  }

  const newSmooth = parseFloat(smoothing);
  if (analyser.smoothingTimeConstant !== newSmooth) {
    analyser.smoothingTimeConstant = newSmooth;
  }

  dataArray = new Uint8Array(analyser.fftSize);
};

// Connect source to analyser
const connectSource = () => {
  if (source) source.disconnect();
  source = audioCtx.createMediaElementSource(audioEl);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
};

// Drawing functions
const drawWaveform = () => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  analyser.getByteTimeDomainData(dataArray);

  const sensitivity = parseFloat(sensitivitySlider.value);
  const lineWidth = parseFloat(lineWidthSlider.value);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = lineWidth;
  const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
  lineGradient.addColorStop(0, '#9333ea');
  lineGradient.addColorStop(1, '#3b82f6');
  ctx.strokeStyle = lineGradient;
  ctx.beginPath();

  const bufferLength = analyser.fftSize;
  const sliceWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = height / 2 + (v - 1) * (height / 2) * sensitivity;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  ctx.lineTo(width, height / 2);
  ctx.stroke();
};

const drawSpectrum = () => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  analyser.getByteFrequencyData(dataArray);

  const sensitivity = parseFloat(sensitivitySlider.value);
  const lineWidth = parseFloat(lineWidthSlider.value);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(0, 0, width, height);

  const bars = Math.min(256, analyser.frequencyBinCount);
  const barWidth = width / bars;
  let x = 0;

  for (let i = 0; i < bars; i++) {
    let barHeight = (dataArray[i] / 255) * height * sensitivity;
    const hue = i * (250 / bars) + 200;
    const saturation = 80;
    const lightness = 50 + (dataArray[i] / 10);
    const barGradient = ctx.createLinearGradient(x, height - barHeight, x, height);
    barGradient.addColorStop(0, `hsl(${hue}, ${saturation}%, 75%)`);
    barGradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
    barGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = barGradient;
    ctx.fillRect(x, height - barHeight, barWidth - lineWidth, barHeight);

    x += barWidth;
  }
};

// Main loop
const draw = () => {
  frameId = requestAnimationFrame(draw);
  if (animationMode === 'waveform') {
    drawWaveform();
  } else if (animationMode === 'spectrum') {
    drawSpectrum();
  }
};

// disabled title="Not yet implemented

// Play / Pause logic
const togglePlayPause = () => {
  if (!audioCtx) {
    setupAudio(fftSizeSelect.value, smoothingSlider.value);
    connectSource();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (audioEl.paused) {
    audioEl.play().then(() => {
      pauseIcon.classList.remove('hidden');
      playIcon.classList.add('hidden');
      if (frameId === null) draw();
    }).catch(e => console.error("Play failed:", e));
  } else {
    audioEl.pause();
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
};

// Mode button logic
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.textContent.toLowerCase();
    if (mode === 'spectrogram') return;

    animationMode = mode;

    modeButtons.forEach(b => {
      if (b.textContent.toLowerCase() === mode) {
        b.classList.add('gradient-bg', 'text-white', 'shadow-lg', 'hover:shadow-xl');
        b.classList.remove('bg-gray-700/50', 'text-gray-300', 'hover:bg-gray-600/50');
      } else {
        if (b.id !== 'mode-spectrogram') {
          b.classList.remove('gradient-bg', 'text-white', 'shadow-lg', 'hover:shadow-xl');
          b.classList.add('bg-gray-700/50', 'text-gray-300', 'hover:bg-gray-600/50');
        }
      }
    });

    if (audioCtx && analyser) {
      setupAudio(fftSizeSelect.value, smoothingSlider.value);
    }
  });
});

// Volume control
volumeSlider.addEventListener('input', () => {
  const volume = volumeSlider.value;
  audioEl.volume = volume / 100;
  volumeValue.textContent = `${volume}%`;
});

// FFT & smoothing controls
fftSizeSelect.addEventListener('change', () => {
  if (audioCtx) {
    setupAudio(fftSizeSelect.value, smoothingSlider.value);
  }
});

smoothingSlider.addEventListener('input', () => {
  smoothingValue.textContent = parseFloat(smoothingSlider.value).toFixed(2);
  if (audioCtx) {
    setupAudio(fftSizeSelect.value, smoothingSlider.value);
  }
});

// Sensitivity & line width display
sensitivitySlider.addEventListener('input', () => {
  sensitivityValue.textContent = `${sensitivitySlider.value}`;
});
lineWidthSlider.addEventListener('input', () => {
  lineWidthValue.textContent = `${lineWidthSlider.value}`;
});

// Progress slider
progressSlider.addEventListener('input', () => {
  progressSlider.isDragging = true;
});
progressSlider.addEventListener('change', () => {
  audioEl.currentTime = progressSlider.value;
  progressSlider.isDragging = false;

  // ✅ Resume drawing if needed
  if (!audioEl.paused && frameId === null) {
    draw();
  }
});

audioEl.ontimeupdate = () => {
  currentTimeEl.textContent = formatTime(audioEl.currentTime);
  if (!progressSlider.isDragging) {
    progressSlider.value = audioEl.currentTime;
  }
};
audioEl.onloadedmetadata = () => {
  totalTimeEl.textContent = formatTime(audioEl.duration);
  progressSlider.max = audioEl.duration;
};
audioEl.onended = () => {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
  playIcon.classList.remove('hidden');
  pauseIcon.classList.add('hidden');
  audioEl.currentTime = 0;
};

// File upload
audioInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    audioEl.src = url;
    audioEl.load();

    overlay.classList.add('hidden');
    playPauseBtn.disabled = false;
    downloadBtn.href = url;
    downloadBtn.download = file.name;

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (audioCtx && analyser) {
      setupAudio(fftSizeSelect.value, smoothingSlider.value);
      connectSource();
    }
  }
});

// Resize canvas when window resizes
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Toggle play/pause on button click
playPauseBtn.addEventListener('click', togglePlayPause);
