/* ═══════════════════════════════════════════════════════════════
   SNAKE CLASSIC — Game Engine
   High-performance Canvas renderer with smooth animation
   ═══════════════════════════════════════════════════════════════ */

const Game = (() => {
    'use strict';

    /* ─── Constants ─── */
    const GRID_SIZE = 20;          // cells per row/col
    const BASE_SPEED = {           // ms per game tick
        slow: 160,
        normal: 110,
        fast: 70
    };

    /* ─── State ─── */
    let canvas, ctx, canvasSize, cellSize;
    let snake, direction, nextDirection, food;
    let score, isRunning, isPaused, gameOverFlag, didSetNewHigh;
    let highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
    let lastTick, tickInterval, elapsed;
    let animFrame;
    let particles = [];
    let gridFlash = 0;

    /* ─── Blink & Tongue Animation State ─── */
    let lastBlinkStart = -5000;
    let nextBlinkDelay = 3000;
    let isDoubleBlink = false;
    let lastTongueFlick = -3000;
    let nextTongueDelay = 2000;

    /* ─── Settings (synced from UI) ─── */
    let settings = {
        speed: 'normal',
        skin: 'classic',
        map: 'classic',
        controls: 'both',
        food: 'mixed'
    };

    /* ─── Food Definitions ─── */
    const FOODS = [
        { id: 'mixed', name: 'Mixed', emojis: ['🍎', '🍊', '🍌', '🍓', '🍇', '🍉', '🍒', '🍑'] },
        { id: 'apple', name: 'Apple', emojis: ['🍎'] },
        { id: 'orange', name: 'Orange', emojis: ['🍊'] },
        { id: 'banana', name: 'Banana', emojis: ['🍌'] },
        { id: 'strawberry', name: 'Strawberry', emojis: ['🍓'] },
        { id: 'grapes', name: 'Grapes', emojis: ['🍇'] }
    ];

    /* ─── Snake Skin Definitions ─── */
    const SKINS = {
        classic: {
            name: 'Classic Green',
            head: '#4cce5b',
            body: '#5bd469',
            bodyAlt: '#4cce5b',
            outline: '#2e9e3e',
            belly: '#8eed8e',
            eyeColor: '#ffffff',
            pupilColor: '#1a1a2e',
            tongueColor: '#e74c6f'
        },
        neon: {
            name: 'Neon Glow',
            head: '#00e5ff',
            body: '#00d4ff',
            bodyAlt: '#00bfff',
            outline: '#0088aa',
            belly: '#80f0ff',
            eyeColor: '#ffffff',
            pupilColor: '#002233',
            tongueColor: '#ff3399',
            glow: true,
            glowColor: 'rgba(0, 229, 255, 0.35)'
        },
        retro: {
            name: 'Retro Pixel',
            head: '#8bac0f',
            body: '#9bbc0f',
            bodyAlt: '#8bac0f',
            outline: '#306230',
            belly: '#c8e060',
            eyeColor: '#e0f0a0',
            pupilColor: '#0f380f',
            tongueColor: '#cc3333',
            pixelated: true
        },
        gold: {
            name: 'Gold Metallic',
            head: '#ffcc00',
            body: '#f0b800',
            bodyAlt: '#e6a800',
            outline: '#b8860b',
            belly: '#ffe680',
            eyeColor: '#ffffff',
            pupilColor: '#333333',
            tongueColor: '#cc3333'
        },
        dark: {
            name: 'Dark Stealth',
            head: '#555555',
            body: '#444444',
            bodyAlt: '#3a3a3a',
            outline: '#222222',
            belly: '#777777',
            eyeColor: '#ff4444',
            pupilColor: '#000000',
            tongueColor: '#ff4444'
        },
        coral: {
            name: 'Coral Reef',
            head: '#ff6b6b',
            body: '#ee5a5a',
            bodyAlt: '#e04a4a',
            outline: '#c0392b',
            belly: '#ff9999',
            eyeColor: '#ffffff',
            pupilColor: '#2c1320',
            tongueColor: '#ff3366'
        },
        royal: {
            name: 'Royal Purple',
            head: '#9b59b6',
            body: '#8e44ad',
            bodyAlt: '#7d3c98',
            outline: '#5b2c6f',
            belly: '#c39bd3',
            eyeColor: '#ffffff',
            pupilColor: '#1a0a2e',
            tongueColor: '#e74c3c'
        }
    };

    /* ─── Map Definitions ─── */
    const MAPS = {
        arena: {
            name: 'Open Arena',
            desc: 'No walls, no obstacles — pure survival',
            icon: '🏟️',
            walls: false,
            wrap: true,
            obstacles: [],
            speedIncrease: false
        },
        classic: {
            name: 'Classic Border',
            desc: 'Traditional walls — hit a wall and it\'s over',
            icon: '▣',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        maze: {
            name: 'Maze',
            desc: 'Navigate a complex maze layout',
            icon: '🏁',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        speed: {
            name: 'Speed Challenge',
            desc: 'Speed increases as you eat more',
            icon: '⚡',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: true
        },
        spiral: {
            name: 'Spiral',
            desc: 'Three rings wind into a spiral path',
            icon: '🌀',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        tunnels: {
            name: 'Tunnels',
            desc: 'Narrow corridors to slither through',
            icon: '🚇',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        cross: {
            name: 'Cross',
            desc: 'A giant cross splits the arena into quadrants',
            icon: '✚',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        fortress: {
            name: 'Fortress',
            desc: 'Four corner fortresses block your path',
            icon: '🏰',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        scatter: {
            name: 'Scattered',
            desc: 'Random blocks scattered across the field',
            icon: '🎲',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        corridor: {
            name: 'Corridor',
            desc: 'Zigzag corridors force a winding path',
            icon: '🔀',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        pinwheel: {
            name: 'Pinwheel',
            desc: 'Four rotating L-arms spin across the field',
            icon: '🔄',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        },
        slalom: {
            name: 'Slalom',
            desc: 'Two interlocking L-shapes form an S-curve',
            icon: '〰️',
            walls: true,
            wrap: false,
            obstacles: [],
            speedIncrease: false
        }
    };

    /* Generate obstacles for map types */
    function generateObstacles(mapKey) {
        const obs = [];
        if (mapKey === 'maze') {
            // Horizontal walls
            for (let i = 3; i <= 8; i++) obs.push({ x: i, y: 5 });
            for (let i = 11; i <= 16; i++) obs.push({ x: i, y: 5 });
            for (let i = 3; i <= 8; i++) obs.push({ x: i, y: 14 });
            for (let i = 11; i <= 16; i++) obs.push({ x: i, y: 14 });
            // Vertical walls
            for (let i = 7; i <= 12; i++) obs.push({ x: 5, y: i });
            for (let i = 7; i <= 12; i++) obs.push({ x: 14, y: i });
        } else if (mapKey === 'spiral') {
            // Ring 1 (2..17) — 2-cell gap at bottom of left wall (y=15,16)
            for (let i = 2; i <= 17; i++) obs.push({ x: i, y: 2 }); // top full
            for (let i = 3; i <= 17; i++) obs.push({ x: 17, y: i }); // right full
            for (let i = 2; i <= 16; i++) obs.push({ x: i, y: 17 }); // bottom
            for (let i = 3; i <= 14; i++) obs.push({ x: 2, y: i }); // left, gap at y=15,16
            // Ring 2 (5..14) — 2-cell gap at top-left (x=5,6), left wall starts at y=7
            for (let i = 8; i <= 14; i++) obs.push({ x: i, y: 5 }); // top, gap at x=5,6
            for (let i = 5; i <= 14; i++) obs.push({ x: 14, y: i }); // right full
            for (let i = 5; i <= 13; i++) obs.push({ x: i, y: 14 }); // bottom
            for (let i = 7; i <= 13; i++) obs.push({ x: 5, y: i }); // left, gap at y=5,6
        } else if (mapKey === 'tunnels') {
            // Horizontal tunnel walls with gaps
            for (let i = 0; i <= 7; i++) obs.push({ x: i, y: 4 });
            for (let i = 10; i <= 19; i++) obs.push({ x: i, y: 4 });
            for (let i = 0; i <= 5; i++) obs.push({ x: i, y: 8 });
            for (let i = 8; i <= 19; i++) obs.push({ x: i, y: 8 });
            for (let i = 0; i <= 11; i++) obs.push({ x: i, y: 12 });
            for (let i = 14; i <= 19; i++) obs.push({ x: i, y: 12 });
            for (let i = 0; i <= 3; i++) obs.push({ x: i, y: 16 });
            for (let i = 6; i <= 19; i++) obs.push({ x: i, y: 16 });
        } else if (mapKey === 'cross') {
            // Vertical pair: columns 9 & 10, gap at rows 8–11
            for (const x of [9, 10]) {
                for (let i = 0; i <= 6; i++) obs.push({ x, y: i });
                for (let i = 13; i <= 19; i++) obs.push({ x, y: i });
            }
            // Horizontal pair: rows 9 & 10, gap at columns 8–11
            for (const y of [9, 10]) {
                for (let i = 0; i <= 6; i++) obs.push({ x: i, y });
                for (let i = 13; i <= 19; i++) obs.push({ x: i, y });
            }
        } else if (mapKey === 'fortress') {
            // Top-left fortress
            for (let i = 1; i <= 5; i++) { obs.push({ x: i, y: 1 }); obs.push({ x: 1, y: i }); }
            obs.push({ x: 5, y: 2 }); obs.push({ x: 2, y: 5 });
            // Top-right fortress
            for (let i = 14; i <= 18; i++) { obs.push({ x: i, y: 1 }); obs.push({ x: 18, y: i - 13 }); }
            obs.push({ x: 14, y: 2 }); obs.push({ x: 17, y: 5 });
            // Bottom-left fortress
            for (let i = 1; i <= 5; i++) obs.push({ x: i, y: 18 });
            obs.push({ x: 1, y: 14 }); obs.push({ x: 1, y: 15 }); obs.push({ x: 1, y: 16 }); obs.push({ x: 1, y: 17 });
            obs.push({ x: 2, y: 14 }); obs.push({ x: 5, y: 17 });
            // Bottom-right fortress
            for (let i = 14; i <= 18; i++) obs.push({ x: i, y: 18 });
            obs.push({ x: 18, y: 14 }); obs.push({ x: 18, y: 15 }); obs.push({ x: 18, y: 16 }); obs.push({ x: 18, y: 17 });
            obs.push({ x: 17, y: 14 }); obs.push({ x: 14, y: 17 });
        } else if (mapKey === 'scatter') {
            // Deterministic scattered blocks
            const positions = [
                { x: 3, y: 3 }, { x: 7, y: 2 }, { x: 15, y: 4 }, { x: 12, y: 3 },
                { x: 2, y: 8 }, { x: 6, y: 7 }, { x: 16, y: 7 }, { x: 11, y: 6 },
                { x: 4, y: 13 }, { x: 8, y: 12 }, { x: 14, y: 11 }, { x: 17, y: 13 },
                { x: 3, y: 17 }, { x: 9, y: 16 }, { x: 13, y: 17 }, { x: 16, y: 16 },
                { x: 5, y: 10 }, { x: 10, y: 10 }, { x: 14, y: 9 }, { x: 1, y: 15 },
                { x: 18, y: 2 }, { x: 18, y: 10 }, { x: 1, y: 5 }, { x: 10, y: 1 }
            ];
            positions.forEach(p => obs.push(p));
        } else if (mapKey === 'corridor') {
            // Zigzag corridor walls
            for (let i = 0; i <= 14; i++) obs.push({ x: i, y: 3 });
            for (let i = 5; i <= 19; i++) obs.push({ x: i, y: 7 });
            for (let i = 0; i <= 14; i++) obs.push({ x: i, y: 11 });
            for (let i = 5; i <= 19; i++) obs.push({ x: i, y: 15 });
        } else if (mapKey === 'pinwheel') {
            // 4-fold rotationally symmetric pinwheel arms
            // Arm 1 (NE): up then right
            for (let i = 2; i <= 8; i++) obs.push({ x: 8, y: i });
            for (let i = 8; i <= 15; i++) obs.push({ x: i, y: 2 });
            // Arm 2 (SE): right then down
            for (let i = 11; i <= 17; i++) obs.push({ x: i, y: 8 });
            for (let i = 8; i <= 15; i++) obs.push({ x: 17, y: i });
            // Arm 3 (SW): down then left
            for (let i = 11; i <= 17; i++) obs.push({ x: 11, y: i });
            for (let i = 4; i <= 11; i++) obs.push({ x: i, y: 17 });
            // Arm 4 (NW): left then up
            for (let i = 2; i <= 8; i++) obs.push({ x: i, y: 11 });
            for (let i = 4; i <= 11; i++) obs.push({ x: 2, y: i });
        } else if (mapKey === 'slalom') {
            // Top-right L
            for (let i = 6; i <= 13; i++) obs.push({ x: i, y: 4 }); // horizontal top
            for (let i = 4; i <= 11; i++) obs.push({ x: 13, y: i }); // vertical right drop
            // Bottom-left L
            for (let i = 8; i <= 15; i++) obs.push({ x: 6, y: i }); // vertical left drop
            for (let i = 6; i <= 13; i++) obs.push({ x: i, y: 15 }); // horizontal bottom
        }
        // Deduplicate
        const seen = new Set();
        return obs.filter(o => {
            const k = `${o.x},${o.y}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    /* ─── Initialize ─── */
    function init(canvasEl) {
        canvas = canvasEl;
        ctx = canvas.getContext('2d');
        resize();
        highScore = parseInt(localStorage.getItem('snakeHighScore') || '0', 10);
    }

    function resize() {
        const wrapper = canvas.parentElement;
        const hud = document.querySelector('.game-hud');
        const hudH = hud ? hud.offsetHeight : 64;
        const gap = 12;       // gap between hud and canvas
        const pad = 32;       // 16px top + 16px bottom of game-container

        const availW = window.innerWidth - 32; // 16px left + 16px right
        const availH = window.innerHeight - hudH - gap - pad;
        const size = Math.floor(Math.min(availW, availH, 560));

        canvasSize = size;
        canvas.width = size * window.devicePixelRatio;
        canvas.height = size * window.devicePixelRatio;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        wrapper.style.width = size + 'px';
        wrapper.style.height = size + 'px';
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        cellSize = size / GRID_SIZE;
    }

    /* ─── Start New Game ─── */
    function start() {
        // Reset state
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        didSetNewHigh = false;
        isRunning = true;
        isPaused = false;
        gameOverFlag = false;
        particles = [];
        gridFlash = 0;
        elapsed = 0;

        // Reset animation timers
        const now = performance.now();
        lastBlinkStart = now - 10000;
        nextBlinkDelay = 800;  // first blink happens fast
        isDoubleBlink = false;
        lastTongueFlick = now - 10000;
        nextTongueDelay = 1200; // first tongue flick happens fast
        tickInterval = BASE_SPEED[settings.speed];
        lastTick = performance.now();

        // Generate obstacles FIRST so snake & food won't spawn on them
        const mapCfg = MAPS[settings.map];
        const obsMaps = ['maze', 'spiral', 'tunnels', 'cross', 'fortress', 'scatter', 'corridor', 'pinwheel', 'slalom'];
        if (obsMaps.includes(settings.map)) {
            mapCfg.obstacles = generateObstacles(settings.map);
        } else {
            mapCfg.obstacles = [];
        }

        // Find a safe horizontal starting run of 3 clear cells
        const obsSet = new Set(mapCfg.obstacles.map(o => `${o.x},${o.y}`));
        let startX = 10, startY = 10;
        outer: for (let y = 2; y <= 17; y++) {
            for (let x = 4; x <= 16; x++) {
                if (!obsSet.has(`${x},${y}`) && !obsSet.has(`${x - 1},${y}`) && !obsSet.has(`${x - 2},${y}`)) {
                    startX = x; startY = y;
                    break outer;
                }
            }
        }
        snake = [
            { x: startX, y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY }
        ];

        spawnFood();
        resize();

        // Update display
        if (typeof UI !== 'undefined') {
            UI.updateScore(score);
            UI.updateHighScore(highScore);
        }

        // Start loop
        if (animFrame) cancelAnimationFrame(animFrame);
        animFrame = requestAnimationFrame(gameLoop);
    }

    /* ─── Game Loop (60 FPS render, tick-based logic) ─── */
    function gameLoop(timestamp) {
        if (!isRunning) return;

        animFrame = requestAnimationFrame(gameLoop);

        if (isPaused) {
            render(0);
            return;
        }

        elapsed += timestamp - lastTick;
        lastTick = timestamp;

        // Process game ticks
        while (elapsed >= tickInterval) {
            update();
            elapsed -= tickInterval;
            if (gameOverFlag) return;
        }

        // Render with interpolation factor for smooth movement
        const t = elapsed / tickInterval;
        render(t);
    }

    /* ─── Logic Update (one tick) ─── */
    function update() {
        // Apply buffered direction
        direction = { ...nextDirection };

        // Calculate new head position
        const head = snake[0];
        const newHead = { x: head.x + direction.x, y: head.y + direction.y };
        const mapCfg = MAPS[settings.map];

        // Wrapping
        if (mapCfg.wrap) {
            if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
            if (newHead.x >= GRID_SIZE) newHead.x = 0;
            if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
            if (newHead.y >= GRID_SIZE) newHead.y = 0;
        }

        // Wall collision
        if (mapCfg.walls) {
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                doGameOver();
                return;
            }
        }

        // Self collision (skip tail since it will move)
        for (let i = 0; i < snake.length - 1; i++) {
            if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
                doGameOver();
                return;
            }
        }

        // Obstacle collision
        for (const obs of mapCfg.obstacles) {
            if (obs.x === newHead.x && obs.y === newHead.y) {
                doGameOver();
                return;
            }
        }

        // Move snake
        snake.unshift(newHead);

        // Check food
        if (newHead.x === food.x && newHead.y === food.y) {
            score += 10;
            gridFlash = 1;
            spawnParticles(food.x, food.y);
            AudioEngine.eat();

            // Speed challenge: increase speed
            if (mapCfg.speedIncrease && tickInterval > 50) {
                tickInterval = Math.max(50, tickInterval - 3);
            }

            // High score check
            if (score > highScore) {
                highScore = score;
                didSetNewHigh = true;
                localStorage.setItem('snakeHighScore', String(highScore));
            }

            if (typeof UI !== 'undefined') {
                UI.updateScore(score);
                UI.updateHighScore(highScore);
            }

            spawnFood();
        } else {
            snake.pop();
        }
    }

    /* ─── Render ─── */
    function render(t) {
        const s = cellSize;
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        const skin = SKINS[settings.skin];
        const mapCfg = MAPS[settings.map];

        // Background grid
        drawGrid(skin);

        // Grid flash effect (when food eaten)
        if (gridFlash > 0) {
            ctx.fillStyle = `rgba(34, 214, 91, ${gridFlash * 0.10})`;
            ctx.fillRect(0, 0, canvasSize, canvasSize);
            gridFlash = Math.max(0, gridFlash - 0.04);
        }

        // Draw obstacles
        if (mapCfg.obstacles.length > 0) {
            drawObstacles(mapCfg.obstacles);
        }

        // Draw food
        drawFood(t);

        // Draw snake
        drawSnake(skin, t);

        // Draw particles
        updateAndDrawParticles();

        // Draw wall border on top
        drawBorder();

        // Glow overlay for neon skin
        if (skin.glow) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.filter = 'blur(6px)';
            drawSnakeGlow(skin);
            ctx.restore();
        }
    }

    /* ─── Draw Grid ─── */
    function drawGrid(skin) {
        const s = cellSize;
        const isDark = !document.body.classList.contains('light-theme');

        // Dark: match home screen palette (#0a0e17 / #111827)
        const bgBase = isDark ? '#0a0e17' : '#e8ecf1';
        const bgAlt = isDark ? '#111827' : '#e2e6ec';
        const gridLine = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(180, 195, 215, 0.35)';

        // Base fill
        ctx.fillStyle = bgBase;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Subtle checkerboard
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const isAlt = (x + y) % 2 === 0;
                ctx.fillStyle = isAlt ? bgAlt : bgBase;
                ctx.fillRect(x * s, y * s, s, s);
            }
        }

        // Grid lines
        ctx.strokeStyle = gridLine;
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= GRID_SIZE; x++) {
            ctx.beginPath();
            ctx.moveTo(x * s, 0);
            ctx.lineTo(x * s, canvasSize);
            ctx.stroke();
        }
        for (let y = 0; y <= GRID_SIZE; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * s);
            ctx.lineTo(canvasSize, y * s);
            ctx.stroke();
        }
    }

    /* ─── Draw Obstacles ─── */
    function drawObstacles(obstacles) {
        const s = cellSize;
        const pad = 1;
        for (const obs of obstacles) {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
            ctx.fillRect(obs.x * s + pad + 1, obs.y * s + pad + 1, s - pad * 2, s - pad * 2);
            // Main block
            ctx.fillStyle = '#8090a0';
            ctx.fillRect(obs.x * s + pad, obs.y * s + pad, s - pad * 2, s - pad * 2);
            // Highlight
            ctx.fillStyle = '#95a5b5';
            ctx.fillRect(obs.x * s + pad + 2, obs.y * s + pad + 2, s - pad * 2 - 4, s - pad * 2 - 4);
        }
    }

    /* ─── Draw Food (emoji — from pre-rendered offscreen canvas) ─── */
    function drawFood(t) {
        const s = cellSize;
        const cx = food.x * s + s / 2;
        const cy = food.y * s + s / 2;
        const bounce = Math.sin(performance.now() / 420) * s * 0.07;
        const scale = 1 + Math.sin(performance.now() / 320) * 0.05;

        ctx.save();
        ctx.translate(cx, cy + bounce);
        ctx.scale(scale, scale);

        if (food.img) {
            // Draw pre-cached offscreen canvas — instant, no per-frame emoji raster cost
            const half = food.tileSize / 2;
            ctx.drawImage(food.img, -half, -half, food.tileSize, food.tileSize);
        } else {
            // Fallback: direct text
            const fontSize = Math.round(s * 0.85);
            ctx.font = `${fontSize}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(food.emoji || '🍎', 0, s * 0.03);
        }

        ctx.restore();
    }

    /* ─── Draw Wall Border ─── */
    function drawBorder() {
        // Border is now handled by the CSS canvas-wrapper.
        // Just draw a subtle 1px inner edge line for polish.
        const mapCfg = MAPS[settings.map];
        const isDark = !document.body.classList.contains('light-theme');

        // Update wrapper class for wall/no-wall styling
        if (canvas && canvas.parentElement) {
            canvas.parentElement.classList.toggle('no-walls', !mapCfg.walls);
        }

        if (!mapCfg.walls) return;  // no-wall maps have no inner edge

        ctx.save();
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, canvasSize - 1, canvasSize - 1);
        ctx.restore();
    }

    /* ─── Build smooth path points from snake segments ─── */
    function buildSnakePath() {
        const s = cellSize;
        return snake.map(seg => ({
            x: seg.x * s + s / 2,
            y: seg.y * s + s / 2
        }));
    }

    /* ─── Get thickness at a given segment index (taper tail) ─── */
    function getThickness(index, total, baseR, headR) {
        if (index === 0) return headR;
        // First few segments: transition from head to body
        if (index <= 2) {
            const t = index / 2;
            return headR - (headR - baseR) * t;
        }
        // Last segments: taper the tail
        const tailStart = Math.max(3, total - 4);
        if (index >= tailStart) {
            const tailProgress = (index - tailStart) / (total - 1 - tailStart);
            return baseR * (1 - tailProgress * 0.7);
        }
        return baseR;
    }

    /* ─── Draw Snake ─── */
    function drawSnake(skin, t) {
        const s = cellSize;
        const bodyR = s * 0.40;
        const headR = s * 0.50;

        const pts = buildSnakePath();
        if (pts.length < 2) return;

        // ── 1. Draw body outline (slightly larger, darker) ──
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outline pass
        for (let i = pts.length - 1; i >= 1; i--) {
            const cur = pts[i];
            const nxt = pts[i - 1];
            // skip wrap-around connectors
            if (Math.abs(cur.x - nxt.x) > s * 1.5 || Math.abs(cur.y - nxt.y) > s * 1.5) continue;

            const r1 = getThickness(i, pts.length, bodyR, headR);
            const r2 = getThickness(i - 1, pts.length, bodyR, headR);
            const avgR = (r1 + r2) / 2;

            ctx.beginPath();
            ctx.moveTo(cur.x, cur.y);
            ctx.lineTo(nxt.x, nxt.y);
            ctx.lineWidth = avgR * 2 + 4;
            ctx.strokeStyle = skin.outline;
            ctx.stroke();
        }

        // ── 2. Draw main body fill ──
        for (let i = pts.length - 1; i >= 1; i--) {
            const cur = pts[i];
            const nxt = pts[i - 1];
            if (Math.abs(cur.x - nxt.x) > s * 1.5 || Math.abs(cur.y - nxt.y) > s * 1.5) continue;

            const r1 = getThickness(i, pts.length, bodyR, headR);
            const r2 = getThickness(i - 1, pts.length, bodyR, headR);
            const avgR = (r1 + r2) / 2;

            ctx.beginPath();
            ctx.moveTo(cur.x, cur.y);
            ctx.lineTo(nxt.x, nxt.y);
            ctx.lineWidth = avgR * 2;
            ctx.strokeStyle = skin.body;
            ctx.stroke();
        }

        // ── 3. Draw belly/highlight stripe along the body ──
        for (let i = pts.length - 1; i >= 1; i--) {
            const cur = pts[i];
            const nxt = pts[i - 1];
            if (Math.abs(cur.x - nxt.x) > s * 1.5 || Math.abs(cur.y - nxt.y) > s * 1.5) continue;

            const r1 = getThickness(i, pts.length, bodyR, headR);
            const r2 = getThickness(i - 1, pts.length, bodyR, headR);
            const avgR = (r1 + r2) / 2;

            ctx.beginPath();
            ctx.moveTo(cur.x, cur.y);
            ctx.lineTo(nxt.x, nxt.y);
            ctx.lineWidth = avgR * 0.9;
            ctx.strokeStyle = skin.belly || 'rgba(255,255,255,0.15)';
            ctx.globalAlpha = 0.2;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // ── 4. Draw segment circles for smooth joints ──
        for (let i = pts.length - 1; i >= 1; i--) {
            const c = pts[i];
            const r = getThickness(i, pts.length, bodyR, headR);

            // Outline circle
            ctx.beginPath();
            ctx.arc(c.x, c.y, r + 2, 0, Math.PI * 2);
            ctx.fillStyle = skin.outline;
            ctx.fill();

            // Fill circle
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
            ctx.fillStyle = skin.body;
            ctx.fill();
        }

        // ── 5. Draw tail tip (smooth taper) ──
        if (pts.length >= 2) {
            const tail = pts[pts.length - 1];
            const prevTail = pts[pts.length - 2];
            const tailR = getThickness(pts.length - 1, pts.length, bodyR, headR);
            const dx = tail.x - prevTail.x;
            const dy = tail.y - prevTail.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / len;
            const ny = dy / len;

            // Pointed tail tip
            const tipX = tail.x + nx * tailR * 0.8;
            const tipY = tail.y + ny * tailR * 0.8;

            ctx.beginPath();
            ctx.moveTo(tail.x - ny * tailR * 0.4, tail.y + nx * tailR * 0.4);
            ctx.quadraticCurveTo(tipX, tipY, tail.x + ny * tailR * 0.4, tail.y - nx * tailR * 0.4);
            ctx.fillStyle = skin.outline;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(tail.x - ny * tailR * 0.3, tail.y + nx * tailR * 0.3);
            ctx.quadraticCurveTo(tipX - nx * 0.5, tipY - ny * 0.5, tail.x + ny * tailR * 0.3, tail.y - nx * tailR * 0.3);
            ctx.fillStyle = skin.body;
            ctx.fill();
        }

        ctx.restore();

        // ── 6. Draw head ──
        const hc = pts[0];

        // Head outline
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, headR + 2, 0, Math.PI * 2);
        ctx.fillStyle = skin.outline;
        ctx.fill();

        // Head fill with gradient
        ctx.beginPath();
        ctx.arc(hc.x, hc.y, headR, 0, Math.PI * 2);
        const headGrad = ctx.createRadialGradient(
            hc.x - headR * 0.3, hc.y - headR * 0.3, headR * 0.1,
            hc.x, hc.y, headR
        );
        headGrad.addColorStop(0, lightenColor(skin.head, 25));
        headGrad.addColorStop(0.6, skin.head);
        headGrad.addColorStop(1, skin.outline);
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Head highlight (glossy shine)
        ctx.beginPath();
        ctx.arc(hc.x - headR * 0.25, hc.y - headR * 0.3, headR * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();

        // ── 7. Tongue ──
        drawTongue(hc, headR, t, skin);

        // ── 8. Eyes ──
        drawEyes(snake[0], skin, headR);
    }

    /* ─── Draw Tongue (smooth extend → hold → retract) ─── */
    function drawTongue(hc, headR, t, skin) {
        const now = performance.now();
        const timeSinceFlick = now - lastTongueFlick;

        // Tongue cycle: extend (250ms) → hold (500ms) → retract (250ms) = 1000ms total
        const extendTime = 250;
        const holdTime = 500;
        const retractTime = 250;
        const totalCycle = extendTime + holdTime + retractTime; // 1000ms
        let extend = 0;

        if (timeSinceFlick < totalCycle) {
            if (timeSinceFlick < extendTime) {
                // Smooth extend (ease-out)
                const p = timeSinceFlick / extendTime;
                extend = 1 - (1 - p) * (1 - p); // ease-out quad
            } else if (timeSinceFlick < extendTime + holdTime) {
                // Hold out with subtle pulse
                const holdP = (timeSinceFlick - extendTime) / holdTime;
                extend = 0.85 + 0.15 * Math.sin(holdP * Math.PI * 3); // gentle wiggle
            } else {
                // Smooth retract (ease-in)
                const p = (timeSinceFlick - extendTime - holdTime) / retractTime;
                extend = 1 - p * p; // ease-in quad (reversed)
            }
        } else if (timeSinceFlick > totalCycle + nextTongueDelay) {
            lastTongueFlick = now;
            nextTongueDelay = 2000 + Math.random() * 4000;
        }

        if (extend < 0.02) return; // fully retracted — nothing to draw

        const tongueLen = headR * 1.4;
        const forkLen = headR * 0.45;
        const forkSpread = 0.4;

        const dx = direction.x;
        const dy = direction.y;
        const baseX = hc.x + dx * headR * 0.85;
        const baseY = hc.y + dy * headR * 0.85;
        const tipX = hc.x + dx * (headR + tongueLen * extend);
        const tipY = hc.y + dy * (headR + tongueLen * extend);

        const perpX = -dy;
        const perpY = dx;
        const tongueColor = (skin && skin.tongueColor) || '#e74c6f';

        // Subtle lateral wave while tongue is out
        const wave = Math.sin(now / 55) * extend * 2;
        const waveTipX = tipX + perpX * wave;
        const waveTipY = tipY + perpY * wave;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.3 + extend * 0.7;

        // Curved tongue stem
        const midX = (baseX + waveTipX) / 2 + perpX * wave * 0.5;
        const midY = (baseY + waveTipY) / 2 + perpY * wave * 0.5;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(midX, midY, waveTipX, waveTipY);
        ctx.lineWidth = 2.5 * (0.5 + extend * 0.5);
        ctx.strokeStyle = tongueColor;
        ctx.stroke();

        // Fork prong 1 (curved)
        const fork1X = waveTipX + dx * forkLen * extend + perpX * forkLen * forkSpread;
        const fork1Y = waveTipY + dy * forkLen * extend + perpY * forkLen * forkSpread;
        ctx.beginPath();
        ctx.moveTo(waveTipX, waveTipY);
        ctx.quadraticCurveTo(
            waveTipX + dx * forkLen * extend * 0.5 + perpX * forkLen * forkSpread * 0.3,
            waveTipY + dy * forkLen * extend * 0.5 + perpY * forkLen * forkSpread * 0.3,
            fork1X, fork1Y
        );
        ctx.lineWidth = 2 * (0.5 + extend * 0.5);
        ctx.stroke();

        // Fork prong 2 (curved)
        const fork2X = waveTipX + dx * forkLen * extend - perpX * forkLen * forkSpread;
        const fork2Y = waveTipY + dy * forkLen * extend - perpY * forkLen * forkSpread;
        ctx.beginPath();
        ctx.moveTo(waveTipX, waveTipY);
        ctx.quadraticCurveTo(
            waveTipX + dx * forkLen * extend * 0.5 - perpX * forkLen * forkSpread * 0.3,
            waveTipY + dy * forkLen * extend * 0.5 - perpY * forkLen * forkSpread * 0.3,
            fork2X, fork2Y
        );
        ctx.lineWidth = 2 * (0.5 + extend * 0.5);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /* ─── Draw Eyes on Head (googly with blink animation) ─── */
    function drawEyes(head, skin, headR) {
        const s = cellSize;
        const cx = head.x * s + s / 2;
        const cy = head.y * s + s / 2;
        const eyeR = s * 0.22;
        const pupilR = s * 0.12;
        const eyeDist = s * 0.24;
        const eyeFwd = s * 0.10;
        let offsets;

        // Position eyes based on direction
        if (direction.x === 1) {
            offsets = [{ ex: eyeFwd, ey: -eyeDist }, { ex: eyeFwd, ey: eyeDist }];
        } else if (direction.x === -1) {
            offsets = [{ ex: -eyeFwd, ey: -eyeDist }, { ex: -eyeFwd, ey: eyeDist }];
        } else if (direction.y === -1) {
            offsets = [{ ex: -eyeDist, ey: -eyeFwd }, { ex: eyeDist, ey: -eyeFwd }];
        } else {
            offsets = [{ ex: -eyeDist, ey: eyeFwd }, { ex: eyeDist, ey: eyeFwd }];
        }

        // ── Blink calculation ──
        const now = performance.now();
        const timeSinceBlink = now - lastBlinkStart;
        let blinkAmount = 0; // 0 = fully open, 1 = fully closed
        const blinkClose = 120;   // ms to close
        const blinkHold = 80;     // ms eyes stay shut
        const blinkOpen = 150;    // ms to open
        const blinkTotal = blinkClose + blinkHold + blinkOpen; // 350ms full blink

        if (timeSinceBlink < blinkTotal) {
            if (timeSinceBlink < blinkClose) {
                // Closing
                const p = timeSinceBlink / blinkClose;
                blinkAmount = p * p; // ease-in
            } else if (timeSinceBlink < blinkClose + blinkHold) {
                // Holding shut
                blinkAmount = 1;
            } else {
                // Opening
                const p = (timeSinceBlink - blinkClose - blinkHold) / blinkOpen;
                blinkAmount = 1 - p * p; // ease-out reversed
            }
        } else if (isDoubleBlink && timeSinceBlink > blinkTotal + 100 && timeSinceBlink < blinkTotal + 100 + blinkTotal) {
            // Double-blink: second blink starts 100ms after first ends
            const t2 = timeSinceBlink - blinkTotal - 100;
            if (t2 < blinkClose) {
                const p = t2 / blinkClose;
                blinkAmount = p * p;
            } else if (t2 < blinkClose + blinkHold) {
                blinkAmount = 1;
            } else {
                const p = (t2 - blinkClose - blinkHold) / blinkOpen;
                blinkAmount = 1 - p * p;
            }
        } else if (timeSinceBlink > (isDoubleBlink ? blinkTotal * 2 + 100 : blinkTotal) + nextBlinkDelay) {
            // Trigger a new blink
            lastBlinkStart = now;
            isDoubleBlink = Math.random() < 0.25;
            nextBlinkDelay = 2000 + Math.random() * 3500;
        }

        // Clamp
        blinkAmount = Math.max(0, Math.min(1, blinkAmount));

        for (const off of offsets) {
            const ex = cx + off.ex;
            const ey = cy + off.ey;

            // Eye socket / outline
            ctx.beginPath();
            ctx.arc(ex, ey, eyeR + 2, 0, Math.PI * 2);
            ctx.fillStyle = skin.outline || 'rgba(0,0,0,0.3)';
            ctx.fill();

            // ── Fully closed: just draw a line ──
            if (blinkAmount > 0.95) {
                ctx.beginPath();
                ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
                ctx.fillStyle = skin.head;
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(ex - eyeR * 0.8, ey);
                ctx.lineTo(ex + eyeR * 0.8, ey);
                ctx.strokeStyle = skin.outline;
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.stroke();
                continue;
            }

            // ── Draw eye contents inside clip ──
            ctx.save();
            ctx.beginPath();
            ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
            ctx.clip();

            // Eyelid background (head colour fills when eye squishes)
            ctx.fillStyle = skin.head;
            ctx.fillRect(ex - eyeR - 1, ey - eyeR - 1, eyeR * 2 + 2, eyeR * 2 + 2);

            // Squish eye vertically for the blink
            const openAmount = Math.max(0.08, 1 - blinkAmount);
            ctx.save();
            ctx.translate(ex, ey);
            ctx.scale(1, openAmount);
            ctx.translate(-ex, -ey);

            // Sclera with gradient
            ctx.beginPath();
            ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
            const eyeGrad = ctx.createRadialGradient(
                ex - eyeR * 0.15, ey - eyeR * 0.15, 0,
                ex, ey, eyeR
            );
            eyeGrad.addColorStop(0, '#ffffff');
            eyeGrad.addColorStop(1, skin.eyeColor || '#f0f0f0');
            ctx.fillStyle = eyeGrad;
            ctx.fill();

            // Pupil (shifts in movement direction)
            const pupilShiftX = direction.x * 2.5;
            const pupilShiftY = direction.y * 2.5;
            ctx.beginPath();
            ctx.arc(ex + pupilShiftX, ey + pupilShiftY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = skin.pupilColor;
            ctx.fill();

            // Inner pupil highlight
            ctx.beginPath();
            ctx.arc(ex + pupilShiftX, ey + pupilShiftY, pupilR * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();

            // Eye shine (big)
            ctx.beginPath();
            ctx.arc(ex - eyeR * 0.2, ey - eyeR * 0.25, eyeR * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fill();

            // Secondary shine
            ctx.beginPath();
            ctx.arc(ex + eyeR * 0.15, ey + eyeR * 0.1, eyeR * 0.12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();

            ctx.restore(); // undo squish scale

            // ── Eyelid creases during partial blink ──
            if (blinkAmount > 0.08) {
                const crease = eyeR * openAmount;
                ctx.strokeStyle = skin.outline;
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';

                // Top lid edge
                ctx.beginPath();
                ctx.moveTo(ex - eyeR * 0.9, ey - crease);
                ctx.quadraticCurveTo(ex, ey - crease - 3, ex + eyeR * 0.9, ey - crease);
                ctx.stroke();

                // Bottom lid edge
                ctx.beginPath();
                ctx.moveTo(ex - eyeR * 0.9, ey + crease);
                ctx.quadraticCurveTo(ex, ey + crease + 3, ex + eyeR * 0.9, ey + crease);
                ctx.stroke();
            }

            ctx.restore(); // undo clip
        }
    }

    /* ─── Color Helper ─── */
    function lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
        const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
        return `rgb(${r},${g},${b})`;
    }

    /* ─── Neon Glow Layer ─── */
    function drawSnakeGlow(skin) {
        const s = cellSize;
        const pad = 0;
        for (const seg of snake) {
            ctx.fillStyle = skin.glowColor;
            ctx.fillRect(seg.x * s + pad, seg.y * s + pad, s - pad * 2, s - pad * 2);
        }
    }

    /* ─── Rounded Rectangle Helpers ─── */
    function drawRoundRect(x, y, w, h, r, color) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.fillStyle = color;
        ctx.fill();
    }

    function drawRoundRectStroke(x, y, w, h, r) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
        ctx.stroke();
    }

    /* ─── Particles ─── */
    function spawnParticles(gx, gy) {
        const s = cellSize;
        const cx = gx * s + s / 2;
        const cy = gy * s + s / 2;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
            const speed = 1.5 + Math.random() * 2.5;
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.02 + Math.random() * 0.02,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#ff6b6b' : '#fbbf24'
            });
        }
    }

    function updateAndDrawParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /* ─── Food Spawning ─── */
    function spawnFood() {
        const mapCfg = MAPS[settings.map];
        let fx, fy, collides;
        do {
            fx = Math.floor(Math.random() * GRID_SIZE);
            fy = Math.floor(Math.random() * GRID_SIZE);
            collides = false;

            for (const s of snake) {
                if (s.x === fx && s.y === fy) { collides = true; break; }
            }
            if (!collides) {
                for (const obs of mapCfg.obstacles) {
                    if (obs.x === fx && obs.y === fy) { collides = true; break; }
                }
            }
        } while (collides);

        // Pick emoji
        const foodKey = settings.food || 'mixed';
        const foodDef = FOODS.find(f => f.id === foodKey) || FOODS[0];
        const emoji = foodDef.emojis[Math.floor(Math.random() * foodDef.emojis.length)];

        // Pre-render emoji to offscreen canvas so first draw is instant (no cache-miss flicker)
        const tileSize = Math.round(cellSize * 1.4);
        const off = document.createElement('canvas');
        off.width = tileSize;
        off.height = tileSize;
        const octx = off.getContext('2d');
        const fontSize = Math.round(tileSize * 0.82);
        octx.font = `${fontSize}px serif`;
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText(emoji, tileSize / 2, tileSize / 2 + tileSize * 0.03);

        food = { x: fx, y: fy, emoji, img: off, tileSize };
    }

    /* ─── Input ─── */
    function setDirection(dir) {
        if (!isRunning || isPaused || gameOverFlag) return;

        const map = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };
        const d = map[dir];
        if (!d) return;

        // Prevent 180-degree reversal
        if (d.x === -direction.x && d.y === -direction.y) return;

        nextDirection = d;
    }

    function setInitialDir(dirName) {
        const map = {
            up: { x: 0, y: -1 },
            down: { x: 0, y: 1 },
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 }
        };
        const d = map[dirName];
        if (d) { direction = { ...d }; nextDirection = { ...d }; }
    }

    /* ─── Game Over ─── */
    function doGameOver() {
        gameOverFlag = true;
        isRunning = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        AudioEngine.gameOver();

        // Final render with red flash
        ctx.fillStyle = 'rgba(239, 68, 68, 0.20)';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Notify UI
        const isNewHigh = score > 0 && didSetNewHigh;
        if (isNewHigh) {
            AudioEngine.highScore();
        }
        if (typeof UI !== 'undefined') {
            setTimeout(() => UI.showGameOver(score, highScore, isNewHigh), 400);
        }
    }

    /* ─── Pause / Resume ─── */
    function pause() {
        if (!isRunning || gameOverFlag) return;
        isPaused = true;
    }

    function resume() {
        if (!isRunning || gameOverFlag) return;
        isPaused = false;
        lastTick = performance.now();
        elapsed = 0;
    }

    /* ─── Stop completely ─── */
    function stop() {
        isRunning = false;
        if (animFrame) cancelAnimationFrame(animFrame);
    }

    /* ─── Apply Settings ─── */
    function applySettings(newSettings) {
        Object.assign(settings, newSettings);
    }

    function getSettings() {
        return { ...settings };
    }

    function getHighScore() {
        return highScore;
    }

    function resetHighScore() {
        highScore = 0;
        localStorage.setItem('snakeHighScore', '0');
    }

    /* ─── Public API ─── */
    return {
        SKINS,
        MAPS,
        FOODS,
        GRID_SIZE,
        generateObstacles,
        init,
        resize,
        start,
        stop,
        pause,
        resume,
        setDirection,
        setInitialDir,
        applySettings,
        getSettings,
        getHighScore,
        resetHighScore,
        get isRunning() { return isRunning; },
        get isPaused() { return isPaused; }
    };
})();
