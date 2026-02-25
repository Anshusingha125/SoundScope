// Initialize Lucide icons
lucide.createIcons();

// DOM Elements
const canvas = document.getElementById('visualizerCanvas');
const ctx = canvas.getContext('2d');
const audioElement = document.getElementById('audioElement');
const audioFile = document.getElementById('audioFile');
const fileName = document.getElementById('fileName');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volume = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const modeBtns = document.querySelectorAll('.mode-btn');
const lyricsView = document.getElementById('lyricsView');
const lyricsContent = document.getElementById('lyricsContent');
const noAudioOverlay = document.getElementById('noAudioOverlay');
const downloadBtn = document.getElementById('downloadSnapshot');

// Controls
const sensitivity = document.getElementById('sensitivity');
const lineWidth = document.getElementById('lineWidth');
const fftSize = document.getElementById('fftSize');
const smoothing = document.getElementById('smoothing');

// State
let audioContext = null;
let analyser = null;
let source = null;
let dataArray = null;
let animationId = null;
let currentMode = 'waveform';
let isPlaying = false;
let lyrics = [];

// Demo lyrics (since we can't extract real lyrics from audio files)
const demoLyrics = [
    { time: 0, text: "🎵 Music Playing... 🎵" },
    { time: 5, text: "Feel the rhythm flowing through" },
    { time: 10, text: "Every beat, every sound so true" },
    { time: 15, text: "Let the melody take you away" },
    { time: 20, text: "To a place where the music plays" },
    { time: 25, text: "Waves of sound, colors so bright" },
    { time: 30, text: "Dancing through the day and night" },
    { time: 35, text: "Harmony in every note" },
    { time: 40, text: "Let your heart and soul float" },
    { time: 45, text: "🎶 Keep enjoying the music! 🎶" },
    { time: 50, text: "The spectrum shows the frequency" },
    { time: 55, text: "Visual beauty for all to see" },
    { time: 60, text: "Sound waves dancing on the screen" },
    { time: 65, text: "The best visualizer you've ever seen" },
    { time: 70, text: "🎵 Keep the music playing... 🎵" },
    { time: 75, text: "Every song tells a story" },
    { time: 80, text: "Of pain, of joy, of glory" },
    { time: 85, text: "Music is the universal language" },
    { time: 90, text: "That speaks to every age" },
    { time: 95, text: "🎶 Thanks for using SoundScope! 🎶" }
];

// Resize canvas
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth * window.devicePixelRatio;
    canvas.height = container.clientHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = parseInt(fftSize.value);
        analyser.smoothingTimeConstant = parseFloat(smoothing.value);
        
        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
}

// File upload
audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        const url = URL.createObjectURL(file);
        audioElement.src = url;
        noAudioOverlay.classList.add('hidden');
        initAudioContext();
        
        // Reset lyrics
        lyrics = [...demoLyrics];
        updateLyricsDisplay();
    }
});

// Play/Pause
playPauseBtn.addEventListener('click', () => {
    if (!audioElement.src) return;
    
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (isPlaying) {
        audioElement.pause();
    } else {
        audioElement.play();
    }
});

audioElement.addEventListener('play', () => {
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    lucide.createIcons();
    startVisualization();
});

audioElement.addEventListener('pause', () => {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    lucide.createIcons();
});

audioElement.addEventListener('ended', () => {
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    lucide.createIcons();
});

// Progress update
audioElement.addEventListener('timeupdate', () => {
    const percent = (audioElement.currentTime / audioElement.duration) * 100;
    progress.value = percent || 0;
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
    
    if (currentMode === 'lyrics') {
        updateActiveLyric();
    }
});

audioElement.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audioElement.duration);
});

progress.addEventListener('input', () => {
    const time = (progress.value / 100) * audioElement.duration;
    audioElement.currentTime = time;
});

// Volume
volume.addEventListener('input', () => {
    audioElement.volume = volume.value / 100;
    volumeValue.textContent = volume.value + '%';
});

// Mode switching
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        
        if (currentMode === 'lyrics') {
            canvas.classList.add('hidden');
            lyricsView.classList.remove('hidden');
            updateActiveLyric();
        } else {
            canvas.classList.remove('hidden');
            lyricsView.classList.add('hidden');
        }
    });
});

// Control updates
sensitivity.addEventListener('input', () => {
    document.getElementById('sensitivityValue').textContent = sensitivity.value;
});

lineWidth.addEventListener('input', () => {
    document.getElementById('lineWidthValue').textContent = lineWidth.value;
});

smoothing.addEventListener('input', () => {
    document.getElementById('smoothingValue').textContent = smoothing.value;
    if (analyser) analyser.smoothingTimeConstant = parseFloat(smoothing.value);
});

fftSize.addEventListener('change', () => {
    if (analyser) {
        analyser.fftSize = parseInt(fftSize.value);
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    }
});

// Format time
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update lyrics display
function updateLyricsDisplay() {
    lyricsContent.innerHTML = lyrics.map((lyric, index) => `
        <div class="lyric-line" data-time="${lyric.time}" data-index="${index}">
            ${lyric.text}
        </div>
    `).join('');
}

// Update active lyric
function updateActiveLyric() {
    const currentTime = audioElement.currentTime;
    const lines = document.querySelectorAll('.lyric-line');
    
    lines.forEach((line, index) => {
        const time = parseFloat(line.dataset.time);
        const nextTime = lyrics[index + 1]?.time || Infinity;
        
        line.classList.remove('active', 'passed');
        
        if (currentTime >= time && currentTime < nextTime) {
            line.classList.add('active');
            line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (currentTime > time) {
            line.classList.add('passed');
        }
    });
}

// Visualization functions
function drawWaveform() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    analyser.getByteTimeDomainData(dataArray);
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    ctx.lineWidth = parseFloat(lineWidth.value);
    ctx.strokeStyle = '#8b5cf6';
    ctx.beginPath();
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    const sensitivityVal = parseFloat(sensitivity.value);
    
    for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] / 128.0 - 1) * sensitivityVal;
        const y = height / 2 + v * height / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#8b5cf6';
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawSpectrum() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;
    
    analyser.getByteFrequencyData(dataArray);
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);
    
    const barCount = 64;
    const barWidth = width / barCount - 2;
    const sensitivityVal = parseFloat(sensitivity.value);
    
    for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * dataArray.length / barCount);
        const value = dataArray[dataIndex] * sensitivityVal;
        const barHeight = (value / 255) * height * 0.9;
        
        // Gradient color based on height
        const hue = 250 + (value / 255) * 60; // Purple to blue range
        const saturation = 80 + (value / 255) * 20;
        const lightness = 50 + (value / 255) * 30;
        
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness}%)`);
        gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`);
        
        ctx.fillStyle = gradient;
        
        // Rounded bars
        const x = i * (barWidth + 2);
        const y = height - barHeight;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
        
        // Glow effect for high values
        if (value > 200) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}

function startVisualization() {
    if (!analyser) return;
    
    function animate() {
        if (!isPlaying) return;
        
        if (currentMode === 'waveform') {
            drawWaveform();
        } else if (currentMode === 'spectrum') {
            drawSpectrum();
        }
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
}

// Download snapshot
downloadBtn.addEventListener('click', () => {
    if (currentMode === 'lyrics') {
        // Create a canvas from lyrics
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        tempCtx.fillStyle = '#0a0a0f';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        tempCtx.fillStyle = '#8b5cf6';
        tempCtx.font = 'bold 24px Inter';
        tempCtx.textAlign = 'center';
        tempCtx.fillText('Lyrics View', tempCanvas.width / 2, 40);
        
        const link = document.createElement('a');
        link.download = 'soundscope-snapshot.png';
        link.href = tempCanvas.toDataURL();
        link.click();
    } else {
        const link = document.createElement('a');
        link.download = 'soundscope-snapshot.png';
        link.href = canvas.toDataURL();
        link.click();
    }
});

// Initial setup
updateLyricsDisplay();