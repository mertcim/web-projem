document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('actionBtn');
    const audio = document.getElementById('bgMusic');
    const gifContainer = document.getElementById('gifContainer');
    if (!btn) return;

    // Gif listesi
    const GIF_FILES = [
        "Cracking Up Laughing GIF.gif",
        "Cracking Up Lol GIF by Pocoyo.gif",
        "Cracking Up Lol GIF.gif",
        "Dog Laughing GIF.gif",
        "Emoji Laughing GIF.gif",
        "Happy White Cat GIF.gif",
        "Laugh Laughing GIF (1).gif",
        "Laugh Laughing GIF (2).gif",
        "Laugh Laughing GIF.gif",
        "Laughing Out Loud Lol GIF by Minions.gif",
        "Phone Laughing GIF by Sou Eu Na Vida.gif",
        "Season 3 Lol GIF by The Office.gif",
        "Tear Laughing GIF.gif",
        "Wacky Races Lol GIF by Boomerang Official.gif"
    ];

    const START_TIME = 14;
    const PADDING = 80;
    const DANGER_RADIUS = 150;
    const RESET_DELAY = 2200;

    let returnTimeout = null;
    let currentMousePos = { x: -9999, y: -9999 };
    let isEvading = false;

    // --- GIF YÖNETİMİ ---
    let gifDelayTimeout = null;
    let gifInterval = null;
    let mouseStopTimer = null;
    let isMouseMoving = false;

    // Ekranın rastgele bir yerine yeni bir gif ekler (eskiler kalır)
    const spawnGif = () => {
        if (!gifContainer) return;

        const randomFile = GIF_FILES[Math.floor(Math.random() * GIF_FILES.length)];
        const img = document.createElement('img');
        img.src = `gifler/${encodeURIComponent(randomFile)}`;
        img.className = 'random-gif';

        // Ekran sınırları içinde rastgele koordinat
        const gifW = 200;
        const gifH = 200;
        const maxX = Math.max(20, window.innerWidth - gifW - 30);
        const maxY = Math.max(20, window.innerHeight - gifH - 30);

        const x = 20 + Math.random() * maxX;
        const y = 20 + Math.random() * maxY;

        img.style.left = `${x}px`;
        img.style.top = `${y}px`;

        gifContainer.appendChild(img);
    };

    // Fare hareket etmeye başladıktan 2 saniye sonra gifler çıkmaya başlasın
    const startGifSpawner = () => {
        if (isMouseMoving) return;
        isMouseMoving = true;

        clearTimeout(gifDelayTimeout);
        gifDelayTimeout = setTimeout(() => {
            // 2 saniye dolduğunda ilk gifi çıkar
            spawnGif();

            // Ardından her 1 saniyede bir yeni bir gif eklemeye devam et
            clearInterval(gifInterval);
            gifInterval = setInterval(() => {
                spawnGif();
            }, 1000);
        }, 2000); // 2 saniye gecikme
    };

    // Fare hareketi durduğunda tüm gifleri yok et ve sayaçları sıfırla
    const stopGifSpawner = () => {
        isMouseMoving = false;
        clearTimeout(gifDelayTimeout);
        gifDelayTimeout = null;
        clearInterval(gifInterval);
        gifInterval = null;

        // Ekrandaki tüm gifleri yumuşakça soldur ve sil
        if (gifContainer) {
            const currentGifs = gifContainer.querySelectorAll('.random-gif');
            currentGifs.forEach(g => {
                g.classList.add('fading');
                setTimeout(() => g.remove(), 350);
            });
        }
    };

    // --- SES YÖNETİMİ ---
    if (audio) {
        audio.preload = 'auto';

        const setStartTime = () => {
            try { audio.currentTime = START_TIME; } catch (e) {}
        };

        if (audio.readyState >= 1) {
            setStartTime();
        } else {
            audio.addEventListener('loadedmetadata', setStartTime, { once: true });
        }

        const unlockAudio = () => {
            if (audio.paused && isEvading) playMusic();
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('pointerdown', unlockAudio);
        window.addEventListener('keydown', unlockAudio);
    }

    const playMusic = () => {
        if (!audio) return;
        if (audio.paused) {
            try {
                if (Math.abs(audio.currentTime - START_TIME) > 1 && audio.paused) {
                    audio.currentTime = START_TIME;
                }
            } catch (e) {}

            const promise = audio.play();
            if (promise !== undefined) {
                promise.catch(() => {});
            }
        }
    };

    const stopMusic = () => {
        if (!audio) return;
        audio.pause();
        try { audio.currentTime = START_TIME; } catch (e) {}
    };

    // --- BUTON MERKEZE DÖNÜŞ ---
    const returnToCenter = () => {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const distFromCenter = Math.hypot(centerX - currentMousePos.x, centerY - currentMousePos.y);
        if (distFromCenter > DANGER_RADIUS) {
            btn.style.left = '50%';
            btn.style.top = '50%';

            isEvading = false;
            document.body.classList.remove('evading');
            stopMusic();
            stopGifSpawner(); // Buton yerine döndüğünde gifleri temizle
        } else {
            scheduleReturn();
        }
    };

    const scheduleReturn = () => {
        clearTimeout(returnTimeout);
        returnTimeout = setTimeout(returnToCenter, RESET_DELAY);
    };

    // --- BUTON KAÇIŞI ---
    const runAway = (mouseX, mouseY) => {
        isEvading = true;
        document.body.classList.add('evading');
        playMusic();

        const rect = btn.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;

        const deltaX = btnCenterX - mouseX;
        const deltaY = btnCenterY - mouseY;
        const distance = Math.hypot(deltaX, deltaY);

        const minX = PADDING + rect.width / 2;
        const maxX = window.innerWidth - PADDING - rect.width / 2;
        const minY = PADDING + rect.height / 2;
        const maxY = window.innerHeight - PADDING - rect.height / 2;

        const jumpDistance = 170 + Math.random() * 90;
        let newX, newY;

        if (distance === 0) {
            newX = btnCenterX + (Math.random() - 0.5) * jumpDistance * 2;
            newY = btnCenterY + (Math.random() - 0.5) * jumpDistance * 2;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            newX = btnCenterX + Math.cos(angle) * jumpDistance;
            newY = btnCenterY + Math.sin(angle) * jumpDistance;
        }

        if (newX < minX || newX > maxX || newY < minY || newY > maxY) {
            newX = minX + Math.random() * (maxX - minX);
            newY = minY + Math.random() * (maxY - minY);
        }

        btn.style.left = `${newX}px`;
        btn.style.top = `${newY}px`;

        scheduleReturn();
    };

    // --- FARE HAREKETLERİ ---
    window.addEventListener('mousemove', (e) => {
        currentMousePos = { x: e.clientX, y: e.clientY };

        // 1. Fare hareket edince gifleri başlat
        startGifSpawner();

        // 2. Fare hareketi durursa (650ms hareketsizlik) gifleri yok et
        clearTimeout(mouseStopTimer);
        mouseStopTimer = setTimeout(() => {
            stopGifSpawner();
        }, 650);

        // 3. Buton kaçış kontrolü
        const rect = btn.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2;
        const btnCenterY = rect.top + rect.height / 2;
        const dist = Math.hypot(btnCenterX - e.clientX, btnCenterY - e.clientY);

        if (dist < DANGER_RADIUS) {
            runAway(e.clientX, e.clientY);
        }
    });

    btn.addEventListener('mouseenter', (e) => {
        runAway(e.clientX, e.clientY);
    });

    window.addEventListener('mouseleave', () => {
        currentMousePos = { x: -9999, y: -9999 };
        stopGifSpawner();
        scheduleReturn();
    });

    btn.addEventListener('click', (e) => {
        btn.textContent = "Hile Yaptın!";
        setTimeout(() => { btn.textContent = "Tıklama!"; }, 1200);
        runAway(e.clientX, e.clientY);
    });
});
