/* ═══════════════════════════════════════════════════════════════
   SNAKE CLASSIC — UI Controller
   Page navigation, settings, skins, maps, modals, background
   ═══════════════════════════════════════════════════════════════ */

const UI = (() => {
    'use strict';

    /* ─── DOM Cache ─── */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const pages = {
        home: $('#page-home'),
        game: $('#page-game'),
        skins: $('#page-skins'),
        food: $('#page-food'),
        maps: $('#page-maps'),
        settings: $('#page-settings')
    };

    const modals = {
        pause: $('#modal-pause'),
        gameover: $('#modal-gameover'),
        howtoplay: $('#modal-howtoplay')
    };

    const dom = {
        scoreDisplay: $('#score-display'),
        highscoreDisplay: $('#highscore-display'),
        finalScore: $('#final-score'),
        finalHighscore: $('#final-highscore'),
        newHighscoreBadge: $('#new-highscore-badge'),
        countdownOverlay: $('#countdown-overlay'),
        countdownNumber: $('#countdown-number'),
        skinGrid: $('#skin-grid'),
        skinPreviewCanvas: $('#skin-preview-canvas'),
        skinPreviewLabel: $('#skin-preview-label'),
        skinPreviewDesc: $('#skin-preview-desc'),
        mapGrid: $('#map-grid'),
        homeHighscore: $('#home-highscore'),
        foodGrid: $('#food-grid'),
        foodPreviewEmoji: $('#food-preview-emoji'),
        foodPreviewLabel: $('#food-preview-label'),
        foodPreviewDesc: $('#food-preview-desc')
    };

    let currentPage = 'home';
    let countdownTimer = null;
    let skinPreviewAnim = null;  // animation frame for preview

    /* ═══════════════════════ SETTINGS MANAGEMENT ═══════════════════════ */
    const defaults = {
        sound: true,
        music: true,
        speed: 'normal',
        theme: 'dark',
        controls: 'both',
        skin: 'classic',
        map: 'classic',
        food: 'mixed'
    };

    let userSettings = { ...defaults };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('snakeSettings'));
            if (saved) Object.assign(userSettings, saved);
        } catch (e) { /* use defaults */ }
        applySettingsToUI();
        applySettingsToGame();
    }

    function saveSettings() {
        localStorage.setItem('snakeSettings', JSON.stringify(userSettings));
    }

    function applySettingsToUI() {
        // Toggles
        $('#setting-sound').checked = userSettings.sound;
        $('#setting-music').checked = userSettings.music;
        $('#setting-theme').checked = userSettings.theme === 'dark';

        // Speed selector
        $$('#speed-selector .speed-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.speed === userSettings.speed);
        });

        // Control selector
        $$('#control-selector .speed-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.ctrl === userSettings.controls);
        });

        // Theme
        document.body.classList.toggle('light-theme', userSettings.theme === 'light');

        // Audio engine
        AudioEngine.soundEnabled = userSettings.sound;
        AudioEngine.musicEnabled = userSettings.music;
    }

    function applySettingsToGame() {
        Game.applySettings({
            speed: userSettings.speed,
            skin: userSettings.skin,
            map: userSettings.map,
            controls: userSettings.controls,
            food: userSettings.food || 'mixed'
        });
    }

    /* ═══════════════════════ PAGE NAVIGATION ═══════════════════════ */
    function navigateTo(pageName) {
        if (!pages[pageName] || pageName === currentPage) return;

        // Stop skin preview animation when leaving skins page
        if (currentPage === 'skins' && skinPreviewAnim) {
            cancelAnimationFrame(skinPreviewAnim);
            skinPreviewAnim = null;
        }

        // Exit current page
        pages[currentPage].classList.remove('active');
        pages[currentPage].classList.add('exit');

        // After exit animation, show new page
        setTimeout(() => {
            pages[currentPage].classList.remove('exit');
            currentPage = pageName;
            pages[currentPage].classList.add('active');

            // Restart preview animation when entering skins page
            if (pageName === 'skins' && previewSkinKey) {
                updateBigPreview(previewSkinKey);
            }
        }, 200);

        AudioEngine.click();
    }

    /* ═══════════════════════ COUNTDOWN & GAME START ═══════════════════════ */
    function startGame() {
        navigateTo('game');

        // Wait for page transition, then countdown
        setTimeout(() => {
            Game.init($('#gameCanvas'));
            Game.resize();
            showCountdown(() => {
                Game.start();
                AudioEngine.startMusic();
            });
        }, 400);
    }

    function showCountdown(callback) {
        dom.countdownOverlay.classList.add('active');
        let count = 3;
        dom.countdownNumber.textContent = count;
        AudioEngine.countdownTick();

        countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                dom.countdownNumber.textContent = count;
                dom.countdownNumber.style.animation = 'none';
                // Force reflow
                void dom.countdownNumber.offsetWidth;
                dom.countdownNumber.style.animation = '';
                AudioEngine.countdownTick();
            } else if (count === 0) {
                dom.countdownNumber.textContent = 'GO!';
                dom.countdownNumber.style.fontSize = '48px';
                AudioEngine.countdownGo();
            } else {
                clearInterval(countdownTimer);
                dom.countdownOverlay.classList.remove('active');
                dom.countdownNumber.style.fontSize = '';
                callback();
            }
        }, 700);
    }

    /* ═══════════════════════ SCORE DISPLAY ═══════════════════════ */
    function updateScore(score) {
        dom.scoreDisplay.textContent = score;
        dom.scoreDisplay.classList.remove('bump');
        void dom.scoreDisplay.offsetWidth;
        dom.scoreDisplay.classList.add('bump');
    }

    function updateHighScore(hs) {
        dom.highscoreDisplay.textContent = hs;
        if (dom.homeHighscore) dom.homeHighscore.textContent = hs;
    }

    /* ═══════════════════════ MODALS ═══════════════════════ */
    function showModal(name) {
        modals[name].classList.add('active');
    }

    function hideModal(name) {
        modals[name].classList.remove('active');
    }

    function hideAllModals() {
        Object.keys(modals).forEach(k => hideModal(k));
    }

    function showPause() {
        Game.pause();
        showModal('pause');
        AudioEngine.click();
    }

    function showGameOver(score, highScore, isNewHigh) {
        dom.finalScore.textContent = score;
        dom.finalHighscore.textContent = highScore;
        dom.newHighscoreBadge.classList.toggle('show', isNewHigh);
        showModal('gameover');
        AudioEngine.stopMusic();
    }

    /* ═══════════════════════ SKINS PAGE ═══════════════════════ */
    let previewSkinKey = null;

    function buildSkinsPage() {
        const grid = dom.skinGrid;
        grid.innerHTML = '';

        Object.entries(Game.SKINS).forEach(([key, skin]) => {
            const card = document.createElement('div');
            card.className = 'skin-card' + (userSettings.skin === key ? ' selected' : '');
            card.dataset.skin = key;

            // Mini preview canvas
            const preview = document.createElement('div');
            preview.className = 'skin-preview';
            const cvs = document.createElement('canvas');
            cvs.width = 64;
            cvs.height = 56;
            preview.appendChild(cvs);
            drawSkinPreview(cvs, skin);

            // Info
            const info = document.createElement('div');
            info.className = 'skin-info';
            info.innerHTML = `<div class="skin-name">${skin.name}</div><div class="skin-desc">Custom appearance</div>`;

            // Check
            const check = document.createElement('div');
            check.className = 'skin-check';
            check.textContent = '✓';

            card.appendChild(preview);
            card.appendChild(info);
            card.appendChild(check);

            card.addEventListener('click', () => {
                userSettings.skin = key;
                applySettingsToGame();
                saveSettings();
                $$('.skin-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                updateBigPreview(key);
                AudioEngine.click();
            });

            grid.appendChild(card);
        });

        // Initialize big preview with current skin
        updateBigPreview(userSettings.skin);
    }

    function updateBigPreview(skinKey) {
        previewSkinKey = skinKey;
        const skin = Game.SKINS[skinKey];
        if (!skin) return;

        if (dom.skinPreviewLabel) dom.skinPreviewLabel.textContent = skin.name;
        if (dom.skinPreviewDesc) {
            const descs = {
                classic: 'The original — clean, vibrant, timeless',
                neon: 'Glow in the dark with electric cyan',
                retro: 'Old-school pixel vibes from the 80s',
                gold: 'Shiny golden scales for the champion',
                dark: 'Stealth mode — minimal and mysterious',
                coral: 'Warm coral tones from the ocean reef',
                royal: 'Regal purple fit for snake royalty'
            };
            dom.skinPreviewDesc.textContent = descs[skinKey] || 'Custom snake appearance';
        }

        // Start or restart the animated preview
        if (skinPreviewAnim) cancelAnimationFrame(skinPreviewAnim);
        animateBigPreview();
    }

    function animateBigPreview() {
        const canvas = dom.skinPreviewCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const skin = Game.SKINS[previewSkinKey];
        if (!skin) return;

        const now = performance.now();

        ctx.clearRect(0, 0, W, H);

        // Light background with grid
        ctx.fillStyle = '#e8ecf1';
        ctx.fillRect(0, 0, W, H);
        const gridStep = 20;
        for (let x = 0; x < W; x += gridStep) {
            for (let y = 0; y < H; y += gridStep) {
                const isAlt = ((x / gridStep) + (y / gridStep)) % 2 === 0;
                ctx.fillStyle = isAlt ? '#e2e6ec' : '#e8ecf1';
                ctx.fillRect(x, y, gridStep, gridStep);
            }
        }
        ctx.strokeStyle = 'rgba(180, 195, 215, 0.3)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= W; x += gridStep) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y <= H; y += gridStep) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Animated snake path: a gentle S-curve that moves
        const time = now * 0.001;
        const segCount = 12;
        const spacing = 22;
        const pts = [];

        for (let i = 0; i < segCount; i++) {
            const t = i / (segCount - 1);
            const baseX = W * 0.78 - i * spacing;
            const waveY = Math.sin(time * 1.8 + i * 0.6) * 25;
            const baseY = H * 0.48 + waveY;
            pts.push({ x: baseX, y: baseY });
        }

        const bodyR = 13;
        const headR = 17;

        function getR(index) {
            if (index === 0) return headR;
            if (index <= 2) return headR - (headR - bodyR) * (index / 2);
            const tailStart = Math.max(3, segCount - 4);
            if (index >= tailStart) {
                const progress = (index - tailStart) / (segCount - 1 - tailStart);
                return bodyR * (1 - progress * 0.7);
            }
            return bodyR;
        }

        // Outline pass
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = pts.length - 1; i >= 1; i--) {
            const r1 = getR(i), r2 = getR(i - 1);
            const avgR = (r1 + r2) / 2;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineWidth = avgR * 2 + 4;
            ctx.strokeStyle = skin.outline;
            ctx.stroke();
        }

        // Body fill pass
        for (let i = pts.length - 1; i >= 1; i--) {
            const r1 = getR(i), r2 = getR(i - 1);
            const avgR = (r1 + r2) / 2;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineWidth = avgR * 2;
            ctx.strokeStyle = skin.body;
            ctx.stroke();
        }

        // Belly highlight
        for (let i = pts.length - 1; i >= 1; i--) {
            const r1 = getR(i), r2 = getR(i - 1);
            const avgR = (r1 + r2) / 2;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[i - 1].x, pts[i - 1].y);
            ctx.lineWidth = avgR * 0.8;
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = skin.belly || 'rgba(255,255,255,0.3)';
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Joint circles
        for (let i = pts.length - 1; i >= 1; i--) {
            const r = getR(i);
            ctx.beginPath();
            ctx.arc(pts[i].x, pts[i].y, r + 2, 0, Math.PI * 2);
            ctx.fillStyle = skin.outline;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
            ctx.fillStyle = skin.body;
            ctx.fill();
        }

        // Tail tip
        const tail = pts[pts.length - 1];
        const prevT = pts[pts.length - 2];
        const tailR = getR(pts.length - 1);
        const tdx = tail.x - prevT.x;
        const tdy = tail.y - prevT.y;
        const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const tnx = tdx / tlen, tny = tdy / tlen;
        const ttipX = tail.x + tnx * tailR, ttipY = tail.y + tny * tailR;
        ctx.beginPath();
        ctx.moveTo(tail.x - tny * tailR * 0.4, tail.y + tnx * tailR * 0.4);
        ctx.quadraticCurveTo(ttipX, ttipY, tail.x + tny * tailR * 0.4, tail.y - tnx * tailR * 0.4);
        ctx.fillStyle = skin.outline;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tail.x - tny * tailR * 0.3, tail.y + tnx * tailR * 0.3);
        ctx.quadraticCurveTo(ttipX - tnx * 0.5, ttipY - tny * 0.5, tail.x + tny * tailR * 0.3, tail.y - tnx * tailR * 0.3);
        ctx.fillStyle = skin.body;
        ctx.fill();

        // Head
        const hd = pts[0];
        ctx.beginPath();
        ctx.arc(hd.x, hd.y, headR + 2, 0, Math.PI * 2);
        ctx.fillStyle = skin.outline;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hd.x, hd.y, headR, 0, Math.PI * 2);
        const hg = ctx.createRadialGradient(hd.x - headR * 0.3, hd.y - headR * 0.3, headR * 0.1, hd.x, hd.y, headR);
        hg.addColorStop(0, lightenColorUI(skin.head, 25));
        hg.addColorStop(0.6, skin.head);
        hg.addColorStop(1, skin.outline);
        ctx.fillStyle = hg;
        ctx.fill();

        // Head shine
        ctx.beginPath();
        ctx.arc(hd.x - headR * 0.25, hd.y - headR * 0.3, headR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.fill();

        // Direction for eyes/tongue (towards first body seg)
        const dirX = pts[0].x - pts[1].x;
        const dirY = pts[0].y - pts[1].y;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const dnx = dirX / dirLen, dny = dirY / dirLen;

        // Tongue
        const tongueColor = skin.tongueColor || '#e74c6f';
        const flicker = Math.sin(now / 100) * 0.5 + 0.5;
        const extend = 0.4 + flicker * 0.6;
        const tongueLen = headR * 1.3 * extend;
        const forkLen = headR * 0.45;
        const baseX = hd.x + dnx * headR * 0.85;
        const baseY = hd.y + dny * headR * 0.85;
        const tipX = hd.x + dnx * (headR + tongueLen);
        const tipY = hd.y + dny * (headR + tongueLen);
        const perpX = -dny, perpY = dnx;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = tongueColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(tipX, tipY); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + dnx * forkLen + perpX * forkLen * 0.35, tipY + dny * forkLen + perpY * forkLen * 0.35);
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + dnx * forkLen - perpX * forkLen * 0.35, tipY + dny * forkLen - perpY * forkLen * 0.35);
        ctx.stroke();
        ctx.restore();

        // Eyes
        const eyeR = 7;
        const pupilR = 4;
        const eyeDist = 8;
        const eyeFwd = 4;
        const eyeOffsets = [
            { ex: dnx * eyeFwd - dny * eyeDist, ey: dny * eyeFwd + dnx * eyeDist },
            { ex: dnx * eyeFwd + dny * eyeDist, ey: dny * eyeFwd - dnx * eyeDist }
        ];

        for (const off of eyeOffsets) {
            const ex = hd.x + off.ex;
            const ey = hd.y + off.ey;

            // Outline
            ctx.beginPath();
            ctx.arc(ex, ey, eyeR + 2, 0, Math.PI * 2);
            ctx.fillStyle = skin.outline;
            ctx.fill();

            // White
            ctx.beginPath();
            ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
            const eg = ctx.createRadialGradient(ex - 1, ey - 1, 0, ex, ey, eyeR);
            eg.addColorStop(0, '#ffffff');
            eg.addColorStop(1, skin.eyeColor || '#f0f0f0');
            ctx.fillStyle = eg;
            ctx.fill();

            // Pupil
            ctx.beginPath();
            ctx.arc(ex + dnx * 2.5, ey + dny * 2.5, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = skin.pupilColor;
            ctx.fill();

            // Inner pupil
            ctx.beginPath();
            ctx.arc(ex + dnx * 2.5, ey + dny * 2.5, pupilR * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            // Main shine
            ctx.beginPath();
            ctx.arc(ex - eyeR * 0.2, ey - eyeR * 0.25, eyeR * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fill();

            // Secondary shine
            ctx.beginPath();
            ctx.arc(ex + eyeR * 0.15, ey + eyeR * 0.1, eyeR * 0.13, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();
        }

        // Food bobbing around
        const foodX = W * 0.25 + Math.sin(time * 0.7) * 20;
        const foodY = H * 0.30 + Math.cos(time * 0.9) * 15;
        const foodR = 8 + Math.sin(time * 3) * 1;

        ctx.beginPath();
        ctx.arc(foodX + 1, foodY + 2, foodR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(foodX, foodY, foodR + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.10)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(foodX, foodY, foodR, 0, Math.PI * 2);
        const fg = ctx.createRadialGradient(foodX - 2, foodY - 2, 0, foodX, foodY, foodR);
        fg.addColorStop(0, '#ff7878');
        fg.addColorStop(0.5, '#ef4444');
        fg.addColorStop(1, '#c0392b');
        ctx.fillStyle = fg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(foodX - foodR * 0.25, foodY - foodR * 0.3, foodR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fill();

        // Neon glow effect
        if (skin.glow) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = 'blur(8px)';
            for (let i = 0; i < pts.length; i++) {
                const r = getR(i);
                ctx.beginPath();
                ctx.arc(pts[i].x, pts[i].y, r + 4, 0, Math.PI * 2);
                ctx.fillStyle = skin.glowColor;
                ctx.fill();
            }
            ctx.restore();
        }

        skinPreviewAnim = requestAnimationFrame(animateBigPreview);
    }

    function lightenColorUI(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
        const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
        return `rgb(${r},${g},${b})`;
    }

    function drawSkinPreview(canvas, skin) {
        const c = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        c.clearRect(0, 0, w, h);

        // Mini snake segments (as center points)
        const pts = [
            { x: 36, y: 28 },  // head
            { x: 26, y: 28 },  // body
            { x: 16, y: 28 },  // body
            { x: 10, y: 34 }   // tail (curved down)
        ];

        const bodyR = 5;
        const headR = 7;

        // Draw body outline
        c.lineCap = 'round';
        c.lineJoin = 'round';
        for (let i = pts.length - 1; i >= 1; i--) {
            c.beginPath();
            c.moveTo(pts[i].x, pts[i].y);
            c.lineTo(pts[i - 1].x, pts[i - 1].y);
            c.lineWidth = (i === 1 ? headR : bodyR) * 2 + 3;
            c.strokeStyle = skin.outline;
            c.stroke();
        }

        // Draw body fill
        for (let i = pts.length - 1; i >= 1; i--) {
            c.beginPath();
            c.moveTo(pts[i].x, pts[i].y);
            c.lineTo(pts[i - 1].x, pts[i - 1].y);
            c.lineWidth = (i === 1 ? headR : bodyR) * 2;
            c.strokeStyle = skin.body;
            c.stroke();
        }

        // Joint circles
        for (let i = pts.length - 1; i >= 1; i--) {
            const r = i === 1 ? headR : bodyR * (i === pts.length - 1 ? 0.6 : 1);
            c.beginPath();
            c.arc(pts[i].x, pts[i].y, r + 1, 0, Math.PI * 2);
            c.fillStyle = skin.outline;
            c.fill();
            c.beginPath();
            c.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
            c.fillStyle = skin.body;
            c.fill();
        }

        // Head
        c.beginPath();
        c.arc(pts[0].x, pts[0].y, headR + 1.5, 0, Math.PI * 2);
        c.fillStyle = skin.outline;
        c.fill();
        c.beginPath();
        c.arc(pts[0].x, pts[0].y, headR, 0, Math.PI * 2);
        c.fillStyle = skin.head;
        c.fill();

        // Head shine
        c.beginPath();
        c.arc(pts[0].x - 2, pts[0].y - 2, headR * 0.4, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.2)';
        c.fill();

        // Eyes (googly style)
        const eyeOffsets = [{ ex: 2, ey: -3.5 }, { ex: 2, ey: 3.5 }];
        for (const off of eyeOffsets) {
            const ex = pts[0].x + off.ex;
            const ey = pts[0].y + off.ey;
            // outline
            c.beginPath();
            c.arc(ex, ey, 3.5, 0, Math.PI * 2);
            c.fillStyle = skin.outline;
            c.fill();
            // white
            c.beginPath();
            c.arc(ex, ey, 3, 0, Math.PI * 2);
            c.fillStyle = skin.eyeColor || '#fff';
            c.fill();
            // pupil
            c.beginPath();
            c.arc(ex + 1, ey, 1.8, 0, Math.PI * 2);
            c.fillStyle = skin.pupilColor || '#111';
            c.fill();
            // shine
            c.beginPath();
            c.arc(ex - 0.5, ey - 1, 1, 0, Math.PI * 2);
            c.fillStyle = 'rgba(255,255,255,0.8)';
            c.fill();
        }

        // Tongue
        const tongueColor = skin.tongueColor || '#e74c6f';
        c.strokeStyle = tongueColor;
        c.lineWidth = 1.5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(pts[0].x + headR * 0.7, pts[0].y);
        c.lineTo(pts[0].x + headR + 5, pts[0].y);
        c.stroke();
        c.beginPath();
        c.moveTo(pts[0].x + headR + 5, pts[0].y);
        c.lineTo(pts[0].x + headR + 8, pts[0].y - 2);
        c.stroke();
        c.beginPath();
        c.moveTo(pts[0].x + headR + 5, pts[0].y);
        c.lineTo(pts[0].x + headR + 8, pts[0].y + 2);
        c.stroke();

        // Food dot
        c.fillStyle = '#ef4444';
        c.beginPath();
        c.arc(48, 18, 3, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(47, 17, 1, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255,255,255,0.5)';
        c.fill();
    }

    /* ═══════════════════════ MAPS PAGE ═══════════════════════ */
    function buildMapsPage() {
        const grid = dom.mapGrid;
        grid.innerHTML = '';

        Object.entries(Game.MAPS).forEach(([key, map]) => {
            const card = document.createElement('div');
            card.className = 'map-card' + (userSettings.map === key ? ' selected' : '');
            card.dataset.map = key;

            const icon = document.createElement('div');
            icon.className = 'map-icon';
            icon.textContent = map.icon;

            const info = document.createElement('div');
            info.className = 'map-info';
            info.innerHTML = `<div class="map-name">${map.name}</div><div class="map-desc">${map.desc}</div>`;

            const check = document.createElement('div');
            check.className = 'map-check';
            check.textContent = '✓';

            card.appendChild(icon);
            card.appendChild(info);
            card.appendChild(check);

            card.addEventListener('click', () => {
                userSettings.map = key;
                applySettingsToGame();
                saveSettings();
                $$('.map-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                AudioEngine.click();
            });

            grid.appendChild(card);
        });
    }

    /* ═══════════════════════ ANIMATED BACKGROUND ═══════════════════════ */
    function initBackground() {
        // Background is now a static SVG wave — no canvas animation needed
        return;
    }

    /* ═══════════════════════ INPUT HANDLING ═══════════════════════ */
    function initInputs() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            const ctrl = userSettings.controls;

            // Arrow keys
            if (ctrl === 'arrows' || ctrl === 'both') {
                if (key === 'arrowup') { Game.setDirection('up'); e.preventDefault(); }
                if (key === 'arrowdown') { Game.setDirection('down'); e.preventDefault(); }
                if (key === 'arrowleft') { Game.setDirection('left'); e.preventDefault(); }
                if (key === 'arrowright') { Game.setDirection('right'); e.preventDefault(); }
            }

            // WASD
            if (ctrl === 'wasd' || ctrl === 'both') {
                if (key === 'w') { Game.setDirection('up'); e.preventDefault(); }
                if (key === 's') { Game.setDirection('down'); e.preventDefault(); }
                if (key === 'a') { Game.setDirection('left'); e.preventDefault(); }
                if (key === 'd') { Game.setDirection('right'); e.preventDefault(); }
            }

            // Pause with Escape or P
            if ((key === 'escape' || key === 'p') && currentPage === 'game') {
                if (Game.isRunning && !Game.isPaused) {
                    showPause();
                } else if (Game.isRunning && Game.isPaused) {
                    resumeGame();
                }
                e.preventDefault();
            }
        });

        // Mobile controls
        $$('.ctrl-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                Game.setDirection(btn.dataset.dir);
                AudioEngine.init(); // Ensure audio context on mobile
            });
            btn.addEventListener('mousedown', () => {
                Game.setDirection(btn.dataset.dir);
            });
        });

        // Swipe gestures
        let touchStartX = 0, touchStartY = 0;
        const gameContainer = $('#page-game');
        gameContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        gameContainer.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) < 30) return; // Too short

            if (absDx > absDy) {
                Game.setDirection(dx > 0 ? 'right' : 'left');
            } else {
                Game.setDirection(dy > 0 ? 'down' : 'up');
            }
        }, { passive: true });
    }

    /* ═══════════════════════ EVENT BINDINGS ═══════════════════════ */
    function initEvents() {
        // Home navigation buttons
        $$('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioEngine.init(); // Init audio on first interaction
                const action = btn.dataset.action;
                switch (action) {
                    case 'play': startGame(); break;
                    case 'skins': navigateTo('skins'); break;
                    case 'maps': navigateTo('maps'); break;
                    case 'settings': navigateTo('settings'); break;
                    case 'difficulty': navigateTo('settings'); break;
                    case 'food': navigateTo('food'); break;
                    case 'home': quitToMenu(); break;
                }
            });
        });

        // How to Play modal
        const btnHowTo = $('#btn-how-to-play');
        const btnCloseHowTo = $('#btn-close-howto');
        if (btnHowTo) {
            btnHowTo.addEventListener('click', () => {
                showModal('howtoplay');
                AudioEngine.click();
            });
        }
        if (btnCloseHowTo) {
            btnCloseHowTo.addEventListener('click', () => {
                hideModal('howtoplay');
                AudioEngine.click();
            });
        }

        // Game HUD buttons
        $('#btn-back-home').addEventListener('click', () => {
            if (Game.isRunning) showPause();
            else quitToMenu();
        });

        $('#btn-pause').addEventListener('click', () => {
            if (Game.isRunning && !Game.isPaused) showPause();
            else if (Game.isRunning && Game.isPaused) resumeGame();
        });

        // Pause modal
        $('#btn-resume').addEventListener('click', resumeGame);
        $('#btn-restart-pause').addEventListener('click', () => {
            hideAllModals();
            Game.stop();
            startGameDirect();
        });
        $('#btn-quit').addEventListener('click', () => {
            hideAllModals();
            quitToMenu();
        });

        // Game Over modal
        $('#btn-play-again').addEventListener('click', () => {
            hideAllModals();
            startGameDirect();
        });
        $('#btn-menu').addEventListener('click', () => {
            hideAllModals();
            quitToMenu();
        });

        // Settings toggles
        $('#setting-sound').addEventListener('change', (e) => {
            userSettings.sound = e.target.checked;
            AudioEngine.soundEnabled = userSettings.sound;
            saveSettings();
            if (userSettings.sound) AudioEngine.click();
        });

        $('#setting-music').addEventListener('change', (e) => {
            userSettings.music = e.target.checked;
            AudioEngine.musicEnabled = userSettings.music;
            saveSettings();
        });

        $('#setting-theme').addEventListener('change', (e) => {
            userSettings.theme = e.target.checked ? 'dark' : 'light';
            document.body.classList.toggle('light-theme', userSettings.theme === 'light');
            saveSettings();
            AudioEngine.click();
        });

        // Speed selector
        $$('#speed-selector .speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                userSettings.speed = btn.dataset.speed;
                $$('#speed-selector .speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applySettingsToGame();
                saveSettings();
                AudioEngine.click();
            });
        });

        // Control selector
        $$('#control-selector .speed-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                userSettings.controls = btn.dataset.ctrl;
                $$('#control-selector .speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applySettingsToGame();
                saveSettings();
                AudioEngine.click();
            });
        });

        // Reset high score
        $('#btn-reset-score').addEventListener('click', () => {
            Game.resetHighScore();
            AudioEngine.click();
            $('#btn-reset-score').textContent = 'Done!';
            setTimeout(() => { $('#btn-reset-score').textContent = 'Reset'; }, 1500);
        });

        // Button hover sounds
        $$('.btn, .hud-btn, .back-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => AudioEngine.hover());
        });

        // Ripple effect on buttons
        $$('.btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                const rect = this.getBoundingClientRect();
                const ripple = document.createElement('span');
                ripple.className = 'ripple';
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
                ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            });
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (currentPage === 'game' && Game.isRunning) {
                Game.resize();
            }
        });
    }

    /* ─── Helper: Start game directly (skip page nav) ─── */
    function startGameDirect() {
        Game.init($('#gameCanvas'));
        Game.resize();
        showCountdown(() => {
            Game.start();
            AudioEngine.startMusic();
        });
    }

    function resumeGame() {
        hideModal('pause');
        Game.resume();
        AudioEngine.click();
    }

    function quitToMenu() {
        Game.stop();
        AudioEngine.stopMusic();
        hideAllModals();
        navigateTo('home');
        updateSetupCards();
        if (dom.homeHighscore) dom.homeHighscore.textContent = Game.getHighScore ? Game.getHighScore() : 0;
    }

    /* ═══════════════════════ INIT ═══════════════════════ */
    function init() {
        loadSettings();
        buildSkinsPage();
        buildMapsPage();
        buildFoodPage();
        initBackground();
        initInputs();
        initEvents();

        // Show initial high score on HUD and home page
        const hs = Game.getHighScore ? Game.getHighScore() : 0;
        updateHighScore(hs);
        if (dom.homeHighscore) dom.homeHighscore.textContent = hs;

        // Update setup card values
        updateSetupCards();

        // Add hover sounds to new interactive elements
        $$('.setup-card, .setup-settings-btn, .btn-play, .how-to-play-link').forEach(el => {
            el.addEventListener('mouseenter', () => AudioEngine.hover());
        });
    }

    /* ═══════════════════════ FOOD PAGE ═══════════════════════ */
    const FOOD_DESCS = {
        mixed: 'A surprise fruit every time!',
        apple: 'Classic red apple — sweet & crispy',
        orange: 'Juicy orange — full of vitamin C',
        banana: 'Ripe banana — nature\'s fast food',
        strawberry: 'Sweet strawberry — summer vibes',
        grapes: 'Plump grapes — royally delicious'
    };

    function buildFoodPage() {
        const grid = dom.foodGrid;
        if (!grid) return;
        grid.innerHTML = '';

        Game.FOODS.forEach(foodDef => {
            const card = document.createElement('div');
            card.className = 'skin-card' + (userSettings.food === foodDef.id ? ' selected' : '');
            card.dataset.food = foodDef.id;

            // Emoji preview tile
            const preview = document.createElement('div');
            preview.className = 'skin-preview';
            preview.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:28px;background:var(--bg-secondary);border-radius:8px;';
            preview.textContent = foodDef.emojis[0];

            // Info
            const info = document.createElement('div');
            info.className = 'skin-info';
            info.innerHTML = `<div class="skin-name">${foodDef.name}</div><div class="skin-desc">${FOOD_DESCS[foodDef.id] || ''}</div>`;

            // Check
            const check = document.createElement('div');
            check.className = 'skin-check';
            check.textContent = '✓';

            card.appendChild(preview);
            card.appendChild(info);
            card.appendChild(check);

            card.addEventListener('click', () => {
                userSettings.food = foodDef.id;
                applySettingsToGame();
                saveSettings();
                $$('.skin-card[data-food]').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                updateFoodPreview(foodDef.id);
                updateSetupCards();
                AudioEngine.click();
            });

            grid.appendChild(card);
        });

        updateFoodPreview(userSettings.food || 'mixed');
    }

    function updateFoodPreview(foodId) {
        const foodDef = Game.FOODS.find(f => f.id === foodId);
        if (!foodDef) return;
        // Cycle through emojis in preview if mixed, else show single
        const emoji = foodDef.emojis.join(' ');
        if (dom.foodPreviewEmoji) dom.foodPreviewEmoji.textContent = foodDef.emojis[0];
        if (dom.foodPreviewLabel) dom.foodPreviewLabel.textContent = foodDef.name;
        if (dom.foodPreviewDesc) dom.foodPreviewDesc.textContent = FOOD_DESCS[foodId] || '';
    }

    function cycleFood() {
        const foodList = Game.FOODS.map(f => f.id);
        const idx = foodList.indexOf(userSettings.food || 'mixed');
        userSettings.food = foodList[(idx + 1) % foodList.length];
        applySettingsToGame();
        saveSettings();
        updateSetupCards();
        AudioEngine.click();
    }

    function updateSetupCards() {
        const speedNames = { slow: 'Easy', normal: 'Normal', fast: 'Hard' };
        const diffVal = $('#setup-difficulty-val');
        const skinVal = $('#setup-skin-val');
        const mapVal = $('#setup-map-val');
        const foodVal = $('#setup-food-val');
        if (diffVal) diffVal.textContent = speedNames[userSettings.speed] || 'Normal';
        if (skinVal) {
            const skinData = Game.SKINS[userSettings.skin];
            skinVal.textContent = skinData ? skinData.name : 'Classic';
        }
        if (mapVal) {
            const mapData = Game.MAPS[userSettings.map];
            mapVal.textContent = mapData ? mapData.name : 'Classic';
        }
        if (foodVal) {
            const foodData = Game.FOODS.find(f => f.id === (userSettings.food || 'mixed'));
            foodVal.textContent = foodData ? foodData.name : 'Mixed';
        }
    }

    // Boot when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ─── Public API ─── */
    return {
        updateScore,
        updateHighScore,
        showGameOver,
        navigateTo
    };
})();
