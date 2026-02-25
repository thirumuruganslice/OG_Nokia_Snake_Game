/* ========================================
   INPUT HANDLER — Keyboard + Touch + Swipe
   ======================================== */

class InputHandler {
    constructor() {
        this.direction = null;       // Queued direction from input
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30;
        this.onDirection = null;     // Callback: (dir) => {}
        this.onPause = null;         // Callback: () => {}
        this.onAnyKey = null;        // Callback: () => {}

        this._bindKeyboard();
        this._bindTouch();
        this._bindMobileButtons();
    }

    _bindKeyboard() {
        document.addEventListener('keydown', (e) => {
            // sound.init();
            // sound.resume();

            if (this.onAnyKey) this.onAnyKey(e.key);

            const key = e.key.toLowerCase();
            let dir = null;

            switch (key) {
                case 'arrowup': case 'w': dir = 'up'; break;
                case 'arrowdown': case 's': dir = 'down'; break;
                case 'arrowleft': case 'a': dir = 'left'; break;
                case 'arrowright': case 'd': dir = 'right'; break;
                case 'p': case 'escape':
                    if (this.onPause) this.onPause();
                    e.preventDefault();
                    return;
            }

            if (dir) {
                e.preventDefault();
                this.direction = dir;
                if (this.onDirection) this.onDirection(dir);
            }
        });
    }

    _bindTouch() {
        const canvas = document.getElementById('game-canvas');
        if (!canvas) return;

        canvas.addEventListener('touchstart', (e) => {
            // sound.init();
            // sound.resume();
            const touch = e.touches[0];
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const dx = touch.clientX - this.touchStartX;
            const dy = touch.clientY - this.touchStartY;

            if (Math.abs(dx) < this.swipeThreshold && Math.abs(dy) < this.swipeThreshold) return;

            let dir;
            if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? 'right' : 'left';
            } else {
                dir = dy > 0 ? 'down' : 'up';
            }

            this.direction = dir;
            if (this.onDirection) this.onDirection(dir);
            e.preventDefault();
        }, { passive: false });
    }

    _bindMobileButtons() {
        document.querySelectorAll('.ctrl-btn').forEach(btn => {
            const handler = (e) => {
                e.preventDefault();
                // sound.init();
                // sound.resume();
                const dir = btn.dataset.dir;
                if (dir) {
                    this.direction = dir;
                    if (this.onDirection) this.onDirection(dir);
                }
            };
            btn.addEventListener('touchstart', handler, { passive: false });
            btn.addEventListener('mousedown', handler);
        });
    }

    consumeDirection() {
        const dir = this.direction;
        this.direction = null;
        return dir;
    }
}

// Global instance
const input = new InputHandler();
