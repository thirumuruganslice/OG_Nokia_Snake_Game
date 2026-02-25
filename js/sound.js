/* ========================================
   SOUND MANAGER — Web Audio API Synth
   No external sound files needed
   ======================================== */

class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
        this.masterGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                this.muted ? 0 : 0.3, this.ctx.currentTime, 0.02
            );
        }
        return this.muted;
    }

    // ---- Sound: Eat food ----
    playEat() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;

        // Quick ascending chirp
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);

        // Harmony note
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(600, t + 0.03);
        osc2.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
        gain2.gain.setValueAtTime(0.12, t + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(t + 0.03);
        osc2.stop(t + 0.15);
    }

    // ---- Sound: Turn / direction change ----
    playTurn() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.setValueAtTime(260, t + 0.02);
        gain.gain.setValueAtTime(0.06, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.05);
    }

    // ---- Sound: Game Over ----
    playGameOver() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;

        // Descending tones
        const notes = [440, 370, 311, 220];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.15);
            gain.gain.setValueAtTime(0.2, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.15);
            osc.stop(t + i * 0.15 + 0.14);
        });

        // Low rumble
        const noise = this.ctx.createOscillator();
        const noiseGain = this.ctx.createGain();
        noise.type = 'sawtooth';
        noise.frequency.setValueAtTime(80, t + 0.5);
        noise.frequency.exponentialRampToValueAtTime(30, t + 1.0);
        noiseGain.gain.setValueAtTime(0.15, t + 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 1.0);
        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t + 0.5);
        noise.stop(t + 1.0);
    }

    // ---- Sound: Countdown beep ----
    playCountdown(final = false) {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = final ? 'square' : 'sine';
        osc.frequency.setValueAtTime(final ? 880 : 440, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + (final ? 0.2 : 0.12));
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + (final ? 0.2 : 0.12));
    }

    // ---- Sound: Level Up ----
    playLevelUp() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.08);
            gain.gain.setValueAtTime(0.15, t + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.1);
        });
    }

    // ---- Sound: Menu select ----
    playSelect() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    // ---- Sound: New record ----
    playRecord() {
        if (!this.initialized || this.muted) return;
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t + i * 0.1);
            gain.gain.setValueAtTime(0.12, t + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.1 + 0.12);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + i * 0.1);
            osc.stop(t + i * 0.1 + 0.12);
        });
    }
}

// Global instance
const sound = new SoundManager();
