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

    // --- GİRİŞ PERDESİ ---
    // Tarayıcılar sesi ancak gerçek bir kullanıcı tıklamasından sonra çalmaya izin veriyor.
    // Sayfa ilk açıldığında bu soruyu sorup o tıklamayla ses kilidini açıyoruz.
    const gate = document.getElementById('introGate');
    let gateOpen = !!gate;

    const closeGate = () => {
        if (!gateOpen) return;
        gateOpen = false;

        // Kilidi aç: tıklama anında sessizce çal-durdur, böylece ilk kaçışta şarkı anında başlar
        if (audio) {
            audio.muted = true;
            const p = audio.play();
            const reset = () => {
                audio.pause();
                try { audio.currentTime = START_TIME; } catch (e) {}
                audio.muted = false;
            };
            if (p !== undefined) p.then(reset).catch(reset); else reset();
        }

        gate.classList.add('hidden');
        document.body.classList.remove('gated');
        setTimeout(() => gate.remove(), 500);
    };

    if (gate) {
        gate.querySelectorAll('.gate-btn').forEach(b => b.addEventListener('click', closeGate));
    }

    // --- BUTONLAR (mitoz: her başarılı tık butonu ikiye böler) ---
    // Bırakılınca tüm kopyalar ortada tek butonda birleşir.
    const MAX_BUTTONS = 64;      // performans için üst sınır
    const SPLIT_OFFSET = 70;     // bölünmede yavru hücrelerin merkezden uzaklığı
    const SPLIT_PAUSE = 450;     // bölünme görünsün diye kaçışın beklediği süre (ms)
    const cells = [];            // { el, evading } — cells[0] her zaman asıl buton
    let pauseEvadeUntil = 0;

    const centerOf = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const bounds = (el) => {
        const r = el.getBoundingClientRect();
        const minX = PADDING + r.width / 2;
        const minY = PADDING + r.height / 2;
        return {
            minX, minY,
            maxX: Math.max(minX, window.innerWidth - PADDING - r.width / 2),
            maxY: Math.max(minY, window.innerHeight - PADDING - r.height / 2)
        };
    };

    const placeAt = (c, x, y) => {
        c.el.style.left = `${x}px`;
        c.el.style.top = `${y}px`;
    };

    // Herhangi bir buton kaçıyorsa müzik + renk animasyonu açık, hepsi yuvadaysa kapalı
    const updateEvadingState = () => {
        const any = cells.some(c => c.evading);
        if (any === isEvading) return;
        isEvading = any;
        if (isEvading) {
            document.body.classList.add('evading');
            playMusic();
        } else {
            document.body.classList.remove('evading');
            stopMusic();
            stopGifSpawner();
        }
    };

    // Bırakıldığında: tüm kopyalar ortaya akıp kaybolur, tek buton ortada kalır, şarkı durur
    const collapseAll = () => {
        const origin = cells[0];
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        cells.slice(1).forEach(c => {
            c.el.classList.add('merging');
            placeAt(c, cx, cy);
            setTimeout(() => c.el.remove(), 450);
        });
        cells.length = 1;

        origin.el.style.left = '50%';
        origin.el.style.top = '50%';
        origin.evading = false;
        updateEvadingState();
    };

    // Tek ortak sayaç: fare RESET_DELAY boyunca ortadan uzak kalırsa birleştir
    let returnTimer = null;
    const scheduleReturn = () => {
        clearTimeout(returnTimer);
        returnTimer = setTimeout(() => {
            const dist = Math.hypot(window.innerWidth / 2 - currentMousePos.x, window.innerHeight / 2 - currentMousePos.y);
            if (dist > DANGER_RADIUS) collapseAll();
            else scheduleReturn();
        }, RESET_DELAY);
    };

    const runAway = (c, mouseX, mouseY) => {
        c.evading = true;
        updateEvadingState();

        const { x: cx, y: cy } = centerOf(c.el);
        const { minX, maxX, minY, maxY } = bounds(c.el);
        const deltaX = cx - mouseX;
        const deltaY = cy - mouseY;
        const jumpDistance = 170 + Math.random() * 90;
        let newX, newY;

        if (deltaX === 0 && deltaY === 0) {
            newX = cx + (Math.random() - 0.5) * jumpDistance * 2;
            newY = cy + (Math.random() - 0.5) * jumpDistance * 2;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            newX = cx + Math.cos(angle) * jumpDistance;
            newY = cy + Math.sin(angle) * jumpDistance;
        }

        if (newX < minX || newX > maxX || newY < minY || newY > maxY) {
            newX = minX + Math.random() * (maxX - minX);
            newY = minY + Math.random() * (maxY - minY);
        }

        placeAt(c, newX, newY);
        scheduleReturn();
    };

    const evadeNear = (x, y) => {
        cells.forEach(c => {
            const p = centerOf(c.el);
            if (Math.hypot(p.x - x, p.y - y) < DANGER_RADIUS) runAway(c, x, y);
        });
    };

    const playDivideAnim = (el) => {
        el.classList.remove('dividing');
        void el.offsetWidth; // animasyonu yeniden başlat
        el.classList.add('dividing');
    };

    // Butonu ikiye böl: kendisi ve yeni kopyası zıt yönlere ayrılır
    const divide = (c) => {
        const { x: cx, y: cy } = centerOf(c.el);
        const { minX, maxX, minY, maxY } = bounds(c.el);
        const clamp = (x, y) => ({
            x: Math.min(Math.max(x, minX), maxX),
            y: Math.min(Math.max(y, minY), maxY)
        });

        const angle = Math.random() * Math.PI * 2;
        const dx = Math.cos(angle) * SPLIT_OFFSET;
        const dy = Math.sin(angle) * SPLIT_OFFSET;
        const a = clamp(cx - dx, cy - dy);
        const b = clamp(cx + dx, cy + dy);

        playDivideAnim(c.el);
        placeAt(c, cx, cy);
        requestAnimationFrame(() => placeAt(c, a.x, a.y));

        if (cells.length >= MAX_BUTTONS) return;

        const el = c.el.cloneNode(true);
        el.removeAttribute('id');
        el.style.left = `${cx}px`;
        el.style.top = `${cy}px`;
        btn.parentNode.appendChild(el);
        playDivideAnim(el);

        const child = { el, evading: c.evading };
        addCell(child);
        requestAnimationFrame(() => requestAnimationFrame(() => placeAt(child, b.x, b.y)));
    };

    const addCell = (c) => {
        cells.push(c);

        c.el.addEventListener('mouseenter', (e) => {
            if (gateOpen || performance.now() < pauseEvadeUntil) return;
            runAway(c, e.clientX, e.clientY);
        });

        c.el.addEventListener('animationend', () => c.el.classList.remove('dividing'));

        c.el.addEventListener('click', () => {
            c.el.textContent = "Hile Yaptın!";
            setTimeout(() => { c.el.textContent = "Tıklama!"; }, 1200);
            divide(c);
            // Bölünme görüldükten sonra yakındaki hücreler kaçmaya devam etsin
            setTimeout(() => evadeNear(currentMousePos.x, currentMousePos.y), SPLIT_PAUSE);
        });
    };

    addCell({ el: btn, evading: false });

    // Tıklama anında kaçış kısa süre dursun ki mitoz görünsün
    window.addEventListener('pointerdown', (e) => {
        if (e.target.closest && e.target.closest('.fade-btn')) {
            pauseEvadeUntil = performance.now() + SPLIT_PAUSE;
        }
    });

    // --- FARE HAREKETLERİ ---
    window.addEventListener('mousemove', (e) => {
        currentMousePos = { x: e.clientX, y: e.clientY };
        if (gateOpen) return; // Perde açıkken hiçbir şey başlamasın

        // 1. Fare hareket edince gifleri başlat
        startGifSpawner();

        // 2. Fare hareketi durursa (650ms hareketsizlik) gifleri yok et
        clearTimeout(mouseStopTimer);
        mouseStopTimer = setTimeout(() => {
            stopGifSpawner();
        }, 650);

        // 3. Buton kaçış kontrolü (her hücre için)
        if (performance.now() < pauseEvadeUntil) return;
        evadeNear(e.clientX, e.clientY);
    });

    window.addEventListener('mouseleave', () => {
        currentMousePos = { x: -9999, y: -9999 };
        stopGifSpawner();
        scheduleReturn();
    });
});
