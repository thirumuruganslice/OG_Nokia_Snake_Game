/* ========================================
   SNAKE GAME ENGINE — Core Logic & Render
   ======================================== */

(() => {
    'use strict';

    // ---- Configuration ----
    const CONFIG = {
        GRID_SIZE: 20,           // cells across/down
        CELL_SIZE: 0,            // computed at init
        BASE_SPEED: 150,         // ms per tick at level 1
        SPEED_INCREMENT: 12,     // ms faster per level
        MIN_SPEED: 60,           // fastest possible
        FOOD_SCORE: 10,
        LEVEL_THRESHOLD: 5,      // food eaten per level
        INITIAL_LENGTH: 3,
        COUNTDOWN_SECS: 3,
    };

    // ---- State ----
    let canvas, ctx;
    let snake, food, direction, nextDirection;
    let score, highScore, level, foodEaten, totalLength;
    let gameLoop, tickInterval;
    let isPaused, isRunning, isCountingDown;
    let particles = [];
    let foodPulse = 0;
    let gridOffset = { x: 0, y: 0 };

    // ---- DOM refs ----
    const screens = {
        start: document.getElementById('screen-start'),
        how: document.getElementById('screen-how'),
        game: document.getElementById('screen-game'),
        gameover: document.getElementById('screen-gameover'),
    };
    const dom = {
        score: document.getElementById('score'),
        highscore: document.getElementById('highscore'),
        startHighscore: document.getElementById('start-highscore'),
        levelLabel: document.getElementById('level-label'),
        pauseIndicator: document.getElementById('pause-indicator'),
        countdownOverlay: document.getElementById('countdown-overlay'),
        countdownText: document.getElementById('countdown-text'),
        finalScore: document.getElementById('final-score'),
        finalLength: document.getElementById('final-length'),
        finalLevel: document.getElementById('final-level'),
        finalHighscore: document.getElementById('final-highscore'),
        newRecord: document.getElementById('new-record'),
        btnPlay: document.getElementById('btn-play'),
        btnHow: document.getElementById('btn-how'),
        btnBack: document.getElementById('btn-back'),
        btnRetry: document.getElementById('btn-retry'),
        btnMenu: document.getElementById('btn-menu'),
        btnSound: document.getElementById('btn-sound'),
        soundOn: document.getElementById('sound-on-icon'),
        soundOff: document.getElementById('sound-off-icon'),
    };

    // ---- Screen Management ----
    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[name].classList.add('active');
    }

    // ---- High Score ----
    function loadHighScore() {
        highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
    }

    function saveHighScore() {
        localStorage.setItem('snake_highscore', highScore.toString());
    }

    function updateHighScoreDisplays() {
        dom.highscore.textContent = highScore;
        dom.startHighscore.textContent = highScore;
    }

    // ---- Canvas Setup ----
    function setupCanvas() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');

        // Calculate cell size based on available space
        const wrapper = canvas.parentElement;
        const maxDim = Math.min(
            window.innerWidth - 40,
            window.innerHeight - 200,
            480
        );

        CONFIG.CELL_SIZE = Math.floor(maxDim / CONFIG.GRID_SIZE);
        const totalSize = CONFIG.CELL_SIZE * CONFIG.GRID_SIZE;

        canvas.width = totalSize;
        canvas.height = totalSize;
        canvas.style.width = totalSize + 'px';
        canvas.style.height = totalSize + 'px';
    }

    // ---- Initialize Game State ----
    function initGame() {
        const midX = Math.floor(CONFIG.GRID_SIZE / 2);
        const midY = Math.floor(CONFIG.GRID_SIZE / 2);

        snake = [];
        for (let i = CONFIG.INITIAL_LENGTH - 1; i >= 0; i--) {
            snake.push({ x: midX - i, y: midY });
        }

        direction = 'right';
        nextDirection = 'right';
        score = 0;
        level = 1;
        foodEaten = 0;
        totalLength = CONFIG.INITIAL_LENGTH;
        isPaused = false;
        isRunning = false;
        particles = [];
        foodPulse = 0;

        spawnFood();
        updateHUD();
    }

    // ---- Food Spawning ----
    function spawnFood() {
        const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * CONFIG.GRID_SIZE),
                y: Math.floor(Math.random() * CONFIG.GRID_SIZE),
            };
        } while (occupied.has(`${pos.x},${pos.y}`));
        food = pos;
    }

    // ---- Particles ----
    function spawnParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
                y: y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 3,
                color: color,
            });
        }
    }

    function updateParticles() {
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            p.vx *= 0.96;
            p.vy *= 0.96;
            return p.life > 0;
        });
    }

    // ---- Direction Validation ----
    const OPPOSITES = { up: 'down', down: 'up', left: 'right', right: 'left' };

    function setDirection(dir) {
        if (dir && dir !== OPPOSITES[direction]) {
            nextDirection = dir;
        }
    }

    // ---- Game Tick ----
    function tick() {
        if (isPaused || !isRunning) return;

        direction = nextDirection;

        // Calculate new head
        const head = { ...snake[snake.length - 1] };
        switch (direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Wall wrap (go through edges instead of crashing)
        if (head.x < 0) head.x = CONFIG.GRID_SIZE - 1;
        if (head.x >= CONFIG.GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = CONFIG.GRID_SIZE - 1;
        if (head.y >= CONFIG.GRID_SIZE) head.y = 0;

        // Self collision
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOver();
                return;
            }
        }

        snake.push(head);

        // Food collision (disabled to keep score at zero)
        // if (head.x === food.x && head.y === food.y) {
        //     score += CONFIG.FOOD_SCORE * level;
        //     foodEaten++;
        //     totalLength++;
        //     sound.playEat();
        //     spawnParticles(food.x, food.y, '#4ade80', 12);
        //
        //     // Level up check
        //     const newLevel = Math.floor(foodEaten / CONFIG.LEVEL_THRESHOLD) + 1;
        //     if (newLevel > level) {
        //         level = newLevel;
        //         sound.playLevelUp();
        //         updateSpeed();
        //     }
        //
        //     spawnFood();
        //     updateHUD();
        // } else {
        //     snake.shift();
        // }
        snake.shift();
    }

    // ---- Speed ----
    function getSpeed() {
        return Math.max(
            CONFIG.MIN_SPEED,
            CONFIG.BASE_SPEED - (level - 1) * CONFIG.SPEED_INCREMENT
        );
    }

    function updateSpeed() {
        clearInterval(gameLoop);
        tickInterval = getSpeed();
        gameLoop = setInterval(tick, tickInterval);
    }

    // ---- HUD ----
    function updateHUD() {
        dom.score.textContent = score;
        dom.levelLabel.textContent = `LEVEL ${level}`;

        // Score bump animation
        dom.score.classList.add('bump');
        setTimeout(() => dom.score.classList.remove('bump'), 150);
    }

    // ---- Rendering ----
    function render() {
        const cs = CONFIG.CELL_SIZE;
        const gs = CONFIG.GRID_SIZE;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= gs; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cs, 0);
            ctx.lineTo(i * cs, gs * cs);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cs);
            ctx.lineTo(gs * cs, i * cs);
            ctx.stroke();
        }

        // Border glow
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);

        // Food rendering (disabled)
        // foodPulse += 0.08;
        // const pulse = 1 + Math.sin(foodPulse) * 0.15;
        // const foodCX = food.x * cs + cs / 2;
        // const foodCY = food.y * cs + cs / 2;
        // const foodR = (cs / 2 - 2) * pulse;
        //
        // // Food glow
        // const foodGlow = ctx.createRadialGradient(foodCX, foodCY, 0, foodCX, foodCY, cs * 1.5);
        // foodGlow.addColorStop(0, 'rgba(239, 68, 68, 0.15)');
        // foodGlow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        // ctx.fillStyle = foodGlow;
        // ctx.fillRect(food.x * cs - cs, food.y * cs - cs, cs * 3, cs * 3);
        //
        // // Food body
        // ctx.fillStyle = '#ef4444';
        // ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        // ctx.shadowBlur = 8;
        // ctx.beginPath();
        // ctx.roundRect(
        //     foodCX - foodR, foodCY - foodR,
        //     foodR * 2, foodR * 2,
        //     3
        // );
        // ctx.fill();
        // ctx.shadowBlur = 0;

        // Snake
        for (let i = 0; i < snake.length; i++) {
            const seg = snake[i];
            const isHead = i === snake.length - 1;
            const t = i / snake.length; // 0 = tail, 1 = head
            const padding = 1;
            const segSize = cs - padding * 2;

            // Color: gradient from dimmer tail to bright head
            const r = Math.round(34 + t * 0);
            const g = Math.round(120 + t * 77);
            const b = Math.round(50 + t * 30);

            if (isHead) {
                // Head glow
                ctx.shadowColor = 'rgba(74, 222, 128, 0.5)';
                ctx.shadowBlur = 12;
                ctx.fillStyle = '#22c55e';
            } else {
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            }

            const sx = seg.x * cs + padding;
            const sy = seg.y * cs + padding;

            ctx.beginPath();
            ctx.roundRect(sx, sy, segSize, segSize, isHead ? 4 : 2);
            ctx.fill();

            // Inner shine on head
            if (isHead) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.roundRect(sx + 2, sy + 2, segSize - 4, segSize / 2 - 2, 2);
                ctx.fill();

                // Eyes
                const eyeSize = Math.max(2, cs / 8);
                ctx.fillStyle = '#0a0a0f';
                let ex1, ey1, ex2, ey2;
                const center = cs / 2;
                switch (direction) {
                    case 'right':
                        ex1 = sx + segSize - 5; ey1 = sy + center - 4;
                        ex2 = sx + segSize - 5; ey2 = sy + center + 2;
                        break;
                    case 'left':
                        ex1 = sx + 3; ey1 = sy + center - 4;
                        ex2 = sx + 3; ey2 = sy + center + 2;
                        break;
                    case 'up':
                        ex1 = sx + center - 4; ey1 = sy + 3;
                        ex2 = sx + center + 2; ey2 = sy + 3;
                        break;
                    case 'down':
                        ex1 = sx + center - 4; ey1 = sy + segSize - 5;
                        ex2 = sx + center + 2; ey2 = sy + segSize - 5;
                        break;
                }
                ctx.beginPath();
                ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Update particles
        updateParticles();

        // Continue render loop
        requestAnimationFrame(render);
    }

    // ---- Countdown ----
    function startCountdown(callback) {
        isCountingDown = true;
        dom.countdownOverlay.classList.add('visible');

        let count = CONFIG.COUNTDOWN_SECS;
        dom.countdownText.textContent = count;
        // sound.playCountdown(false);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                dom.countdownText.textContent = count;
                dom.countdownText.style.animation = 'none';
                // Force reflow
                void dom.countdownText.offsetWidth;
                dom.countdownText.style.animation = 'countPop 0.5s ease';
                // sound.playCountdown(false);
            } else {
                dom.countdownText.textContent = 'GO!';
                dom.countdownText.style.animation = 'none';
                void dom.countdownText.offsetWidth;
                dom.countdownText.style.animation = 'countPop 0.5s ease';
                // sound.playCountdown(true);

                setTimeout(() => {
                    dom.countdownOverlay.classList.remove('visible');
                    isCountingDown = false;
                    callback();
                }, 400);

                clearInterval(interval);
            }
        }, 800);
    }

    // ---- Start Game ----
    function startGame() {
        setupCanvas();
        initGame();
        showScreen('game');

        // Initial render
        render();

        startCountdown(() => {
            isRunning = true;
            tickInterval = getSpeed();
            gameLoop = setInterval(tick, tickInterval);
        });
    }

    // ---- Pause ----
    function togglePause() {
        if (!isRunning || isCountingDown) return;

        isPaused = !isPaused;
        dom.pauseIndicator.classList.toggle('visible', isPaused);

        if (isPaused) {
            clearInterval(gameLoop);
        } else {
            gameLoop = setInterval(tick, tickInterval);
        }
    }

    // ---- Game Over ----
    function gameOver() {
        isRunning = false;
        clearInterval(gameLoop);
        // sound.playGameOver();

        // Death particles at head
        const head = snake[snake.length - 1];
        spawnParticles(head.x, head.y, '#ef4444', 20);

        // Flash effect
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const isNewRecord = score > highScore;
        if (isNewRecord) {
            highScore = score;
            saveHighScore();
        }

        // Delay before showing game over screen
        setTimeout(() => {
            dom.finalScore.textContent = score;
            dom.finalLength.textContent = totalLength;
            dom.finalLevel.textContent = level;
            dom.finalHighscore.textContent = highScore;

            dom.newRecord.classList.toggle('visible', isNewRecord);
            if (isNewRecord) {
                // setTimeout(() => sound.playRecord(), 300);
            }

            updateHighScoreDisplays();
            showScreen('gameover');
        }, 800);
    }

    // ---- Input Wiring ----
    input.onDirection = (dir) => {
        if (isRunning && !isPaused) {
            setDirection(dir);
            // sound.playTurn();
        }
    };

    input.onPause = () => {
        togglePause();
    };

    // ---- Button Events ----
    dom.btnPlay.addEventListener('click', () => {
        // sound.init();
        // sound.resume();
        // sound.playSelect();
        startGame();
    });

    dom.btnHow.addEventListener('click', () => {
        // sound.init();
        // sound.resume();
        // sound.playSelect();
        showScreen('how');
    });

    dom.btnBack.addEventListener('click', () => {
        // sound.playSelect();
        showScreen('start');
    });

    dom.btnRetry.addEventListener('click', () => {
        // sound.playSelect();
        startGame();
    });

    dom.btnMenu.addEventListener('click', () => {
        // sound.playSelect();
        updateHighScoreDisplays();
        showScreen('start');
    });

    dom.btnSound.addEventListener('click', () => {
        // sound.init();
        // sound.resume();
        // const muted = sound.toggleMute();
        // dom.soundOn.style.display = muted ? 'none' : 'block';
        // dom.soundOff.style.display = muted ? 'block' : 'none';
        // dom.btnSound.classList.toggle('muted', muted);
    });

    // ---- Handle window resize ----
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (screens.game.classList.contains('active')) {
                setupCanvas();
            }
        }, 200);
    });

    // ---- Init ----
    loadHighScore();
    updateHighScoreDisplays();
    showScreen('start');

})();
