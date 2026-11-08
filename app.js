// --- Gestion des Couleurs Locales ---
const savedTop = localStorage.getItem('rtc-top-color') || '#ff4500';
const savedBottom = localStorage.getItem('rtc-bottom-color') || '#cc0000';
document.documentElement.style.setProperty('--bubble-green', savedTop);
document.documentElement.style.setProperty('--bubble-brown', savedBottom);

function updateColors(topColor, bottomColor) {
    document.documentElement.style.setProperty('--bubble-green', topColor);
    document.documentElement.style.setProperty('--bubble-brown', bottomColor);

    const bubbleGreen = document.querySelector('.bubble.green');
    const bubbleBrown = document.querySelector('.bubble.brown');
    if (bubbleGreen) bubbleGreen.style.setProperty('background-color', topColor, 'important');
    if (bubbleBrown) bubbleBrown.style.setProperty('background-color', bottomColor, 'important');

    localStorage.setItem('rtc-top-color', topColor);
    localStorage.setItem('rtc-bottom-color', bottomColor);
}

function setPipetteUI(target, color) {
    const btn = document.getElementById(`btn-pipette-${target}`);
    const input = document.getElementById(`input-color-${target}`);
    if (btn) btn.style.backgroundColor = color;
    if (input) input.value = color;
}

// --- Gestion dynamique du Réseau (RTC ou Lévis) ---
const savedNetwork = localStorage.getItem('rtc-network') || 'rtc';
const networkSelect = document.getElementById('network-select');
if (networkSelect) networkSelect.value = savedNetwork;

function applyNetworkConfig(network) {
    localStorage.setItem('rtc-network', network);
    
    const body = document.body;
    const mainTitle = document.getElementById('main-ticket-title');
    const footerTitle = document.getElementById('footer-ticket-title');
    const serialElem = document.getElementById('serial-display');
    
    if (network === 'levi') {
        body.classList.add('mode-levi');
        if (mainTitle) mainTitle.textContent = "STLévis - Mensuel - Régulier";
        if (footerTitle) footerTitle.textContent = "Réservé au RTC";
    } else {
        body.classList.remove('mode-levi');
        if (mainTitle) mainTitle.textContent = "RTC - 1 passage - Général";
        if (footerTitle) footerTitle.textContent = "Réservé au RTC";
    }
    if (serialElem && !serialElem.dataset.custom) {
        serialElem.textContent = generateSerial('1');
    }
}

function formatTwoDigits(n) { 
    return n < 10 ? '0' + n : n; 
}

function formatTime24h(date) {
    return `${formatTwoDigits(date.getHours())}:${formatTwoDigits(date.getMinutes())}`;
}

function generateSerial(prefix) {
    const characters = '0123456789ABCDEF';
    let result = prefix + '-';
    for (let i = 0; i < 13; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

document.addEventListener('DOMContentLoaded', () => {

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    applyNetworkConfig(savedNetwork);

    if (networkSelect) {
        networkSelect.addEventListener('change', (e) => {
            applyNetworkConfig(e.target.value);
        });
    }

    const serialElem = document.getElementById('serial-display');
    if (serialElem && serialElem.textContent.includes('XXXXXXXXXXXXX')) {
        serialElem.textContent = generateSerial('1');
    }

    const now = new Date();
    const expire = new Date(now.getTime() + 90 * 60 * 1000); 

    const dateStr = `${formatTwoDigits(now.getDate())}/${formatTwoDigits(now.getMonth() + 1)}/${now.getFullYear()}`;
    const timeStr = formatTime24h(now);
    const expireTimeStr = formatTime24h(expire);

    const fullActivation = `${dateStr} à ${timeStr}`;
    const fullExpiration = `${dateStr} à ${expireTimeStr}`;

    document.getElementById('activation-date').textContent = fullActivation;
    document.getElementById('rtc-activation-date').textContent = fullActivation;
    document.getElementById('expiration-date').textContent = fullExpiration;

    const startTime = now.getTime();
    const timerDisplay = document.getElementById('timer-display');
    const progressBar = document.getElementById('progress-bar');
    const totalDuration = 90 * 60; 

    function updateTimeline() {
        const currentTime = new Date().getTime();
        const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

        if (elapsedSeconds >= totalDuration) {
            timerDisplay.textContent = "90:00";
            progressBar.style.width = "100%";
            return;
        }

        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        timerDisplay.textContent = `${formatTwoDigits(mins)}:${formatTwoDigits(secs)}`;

        const percentage = 1 + (elapsedSeconds / totalDuration) * 99;
        progressBar.style.width = `${percentage}%`;
    }

    setInterval(updateTimeline, 1000);
    updateTimeline();

    const screenTicket = document.getElementById('screen-ticket');
    const screenSettings = document.getElementById('screen-settings');

    document.getElementById('btn-to-settings').addEventListener('click', (e) => {
        e.stopPropagation();
        screenTicket.classList.remove('active');
        screenSettings.classList.add('active');
    });

    document.getElementById('btn-back-to-ticket').addEventListener('click', () => {
        const topColor = localStorage.getItem('rtc-top-color') || savedTop;
        const bottomColor = localStorage.getItem('rtc-bottom-color') || savedBottom;
        updateColors(topColor, bottomColor);

        screenSettings.classList.remove('active');
        screenTicket.classList.add('active');
    });

    // --- Animation du rond central ---
    const orbitFollower = document.getElementById('orbit-follower');
    const orbitNode = document.getElementById('orbit-node');
    let isTracking = false;

    function handlePointerDown(e) {
        if (!screenTicket.classList.contains('active') || e.target.closest('#btn-to-settings')) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        if (clientX !== undefined && clientY !== undefined) {
            isTracking = true;
            orbitNode.classList.add('active-speed');
            orbitFollower.style.position = 'fixed';
            orbitFollower.style.width = '60px';
            orbitFollower.style.height = '60px';
            orbitFollower.style.transform = `translate3d(${clientX - 30}px, ${clientY - 30}px, 0)`;
        }
    }

    function handlePointerMove(e) {
        if (!isTracking) return;
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        if (clientX !== undefined && clientY !== undefined) {
            orbitFollower.style.transform = `translate3d(${clientX - 30}px, ${clientY - 30}px, 0)`;
        }
    }

    function handlePointerUp() {
        if (isTracking) {
            isTracking = false;
            orbitNode.classList.remove('active-speed');
            orbitFollower.style.position = 'absolute';
            orbitFollower.style.width = '100%';
            orbitFollower.style.height = '100%';
            orbitFollower.style.transform = '';
        }
    }

    function resetOrbitState() {
        if (isTracking) {
            isTracking = false;
            orbitNode.classList.remove('active-speed');
            orbitFollower.style.position = 'absolute';
            orbitFollower.style.width = '100%';
            orbitFollower.style.height = '100%';
            orbitFollower.style.transform = '';
        }
    }

    screenTicket.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    screenTicket.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    window.addEventListener('blur', resetOrbitState);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetOrbitState();
    });
    window.addEventListener('touchcancel', resetOrbitState);

    // --- Automatisation des couleurs des bulles via l'image ---
    const imageUpload = document.getElementById('image-upload');
    const imagePreview = document.getElementById('image-preview');

    let loadedImgCanvas = null;
    let activePickTarget = 1;

    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    imagePreview.src = event.target.result;
                    imagePreview.style.display = 'block';

                    loadedImgCanvas = document.createElement('canvas');
                    loadedImgCanvas.width = img.width;
                    loadedImgCanvas.height = img.height;
                    const ctx = loadedImgCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    autoPickSmartColors(img, ctx);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function autoPickSmartColors(img, ctx) {
        const width = img.width;
        const height = img.height;
        const rgbToHex = (p) => '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('');

        function findVibrantPixel(startX, startY) {
            const p = ctx.getImageData(startX, startY, 1, 1).data;
            return [p[0], p[1], p[2]];
        }

        const rgb1 = findVibrantPixel(Math.floor(width / 2), Math.floor(height * 0.3));
        const rgb2 = findVibrantPixel(Math.floor(width / 2), Math.floor(height * 0.7));

        const c1 = rgbToHex(rgb1);
        const c2 = rgbToHex(rgb2);

        updateColors(c1, c2);
        setPipetteUI(1, c1);
        setPipetteUI(2, c2);
    }

    function handleImageTouch(e) {
        if (!loadedImgCanvas) return;

        const rect = imagePreview.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const scaleX = loadedImgCanvas.width / rect.width;
        const scaleY = loadedImgCanvas.height / rect.height;

        const x = Math.floor((clientX - rect.left) * scaleX);
        const y = Math.floor((clientY - rect.top) * scaleY);

        const ctx = loadedImgCanvas.getContext('2d');
        const p = ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + [p[0], p[1], p[2]].map(v => v.toString(16).padStart(2, '0')).join('');

        if (activePickTarget === 1) {
            updateColors(hex, localStorage.getItem('rtc-bottom-color') || savedBottom);
            setPipetteUI(1, hex);
            activePickTarget = 2;
        } else {
            updateColors(localStorage.getItem('rtc-top-color') || savedTop, hex);
            setPipetteUI(2, hex);
            activePickTarget = 1;
        }
    }

    if (imagePreview) {
        imagePreview.addEventListener('click', handleImageTouch);
        imagePreview.addEventListener('touchstart', handleImageTouch, { passive: true });
    }

    const btnPipette1 = document.getElementById('btn-pipette-1');
    const btnPipette2 = document.getElementById('btn-pipette-2');
    if (btnPipette1) btnPipette1.addEventListener('click', () => { activePickTarget = 1; });
    if (btnPipette2) btnPipette2.addEventListener('click', () => { activePickTarget = 2; });

    function handleColorSelection(targetId, color) {
        if (targetId === 1) {
            updateColors(color, localStorage.getItem('rtc-bottom-color') || savedBottom);
            setPipetteUI(1, color);
        } else {
            updateColors(localStorage.getItem('rtc-top-color') || savedTop, color);
            setPipetteUI(2, color);
        }
    }

    const inputColor1 = document.getElementById('input-color-1');
    const inputColor2 = document.getElementById('input-color-2');
    if (inputColor1) inputColor1.addEventListener('input', (e) => handleColorSelection(1, e.target.value));
    if (inputColor2) inputColor2.addEventListener('input', (e) => handleColorSelection(2, e.target.value));

    if (savedTop) setPipetteUI(1, savedTop);
    if (savedBottom) setPipetteUI(2, savedBottom);

    const clearCacheBtn = document.getElementById('btn-clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if ('caches' in window) {
                caches.keys().then((keyList) => {
                    return Promise.all(keyList.map((key) => caches.delete(key)));
                }).then(() => {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then((registrations) => {
                            for (let registration of registrations) {
                                registration.unregister();
                            }
                        });
                    }
                    localStorage.clear();
                    alert('Le cache et les paramètres ont été réinitialisés !');
                    window.location.reload();
                });
            }
        });
    }

});

let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.log("Wake Lock non disponible ou refusé");
    }
}

requestWakeLock();

document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});