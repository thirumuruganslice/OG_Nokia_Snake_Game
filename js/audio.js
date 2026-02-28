/* ═══════════════════════════════════════════════════════════════
   SNAKE CLASSIC — Audio Engine
   Lightweight Web Audio API sound manager
   ═══════════════════════════════════════════════════════════════ */

const AudioEngine = (() => {
    'use strict';

    /** @type {AudioContext|null} */
    let ctx = null;
    let soundEnabled = true;
    let musicEnabled = true;
    let musicGain = null;
    let musicSource = null;
    let initialized = false;

    /* ─── Lazy-init AudioContext (must be triggered by user gesture) ─── */
    function init() {
        if (initialized) return;
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.15;
            musicGain.connect(ctx.destination);
            initialized = true;
        } catch (e) {
            console.warn('Audio not supported:', e);
        }
    }

    /* ─── Synthesize sounds procedurally (no external files needed) ─── */

    /**
     * Play a short synth tone
     * @param {number} freq - Frequency in Hz
     * @param {string} type - Oscillator type
     * @param {number} duration - Duration in seconds
     * @param {number} volume - 0 to 1
     * @param {number} [decay] - Time to fade from volume to 0
     */
    function playTone(freq, type, duration, volume, decay) {
        if (!ctx || !soundEnabled) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);

        const d = decay || duration;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    /**
     * Play a frequency sweep
     */
    function playSweep(startFreq, endFreq, type, duration, volume) {
        if (!ctx || !soundEnabled) return;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    /* ─── Sound Effects ─── */

    /** Soft UI hover blip */
    function hover() {
        playTone(800, 'sine', 0.06, 0.04);
    }

    /** UI click / select */
    function click() {
        playTone(600, 'sine', 0.08, 0.08);
        setTimeout(() => playTone(900, 'sine', 0.06, 0.06), 40);
    }

    /** Snake eats food — cheerful ascending blip */
    function eat() {
        playTone(523, 'square', 0.06, 0.07);
        setTimeout(() => playTone(659, 'square', 0.06, 0.07), 50);
        setTimeout(() => playTone(784, 'square', 0.1, 0.06), 100);
    }

    /** Game over — descending buzz */
    function gameOver() {
        playSweep(400, 80, 'sawtooth', 0.6, 0.12);
        setTimeout(() => playTone(80, 'square', 0.3, 0.08), 200);
    }

    /** Countdown tick */
    function countdownTick() {
        playTone(440, 'sine', 0.1, 0.1);
    }

    /** Countdown GO */
    function countdownGo() {
        playTone(880, 'sine', 0.08, 0.1);
        setTimeout(() => playTone(1100, 'sine', 0.12, 0.1), 80);
    }

    /** New high score jingle */
    function highScore() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
            setTimeout(() => playTone(f, 'square', 0.12, 0.08), i * 100);
        });
    }

    /* ─── Background Music (procedural ambient loop) ─── */
    let musicInterval = null;

    function startMusic() {
        if (!ctx || !musicEnabled) return;
        if (ctx.state === 'suspended') ctx.resume();
        stopMusic();

        const baseNotes = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00]; // C3-A3 scale
        let noteIndex = 0;

        musicInterval = setInterval(() => {
            if (!musicEnabled || !ctx) { stopMusic(); return; }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            const note = baseNotes[noteIndex % baseNotes.length];
            osc.frequency.setValueAtTime(note, ctx.currentTime);

            gain.gain.setValueAtTime(0.0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(musicGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 1.4);

            noteIndex++;
        }, 1400);
    }

    function stopMusic() {
        if (musicInterval) {
            clearInterval(musicInterval);
            musicInterval = null;
        }
    }

    /* ─── Public API ─── */
    return {
        init,
        hover,
        click,
        eat,
        gameOver,
        countdownTick,
        countdownGo,
        highScore,
        startMusic,
        stopMusic,

        get soundEnabled() { return soundEnabled; },
        set soundEnabled(v) { soundEnabled = v; },

        get musicEnabled() { return musicEnabled; },
        set musicEnabled(v) {
            musicEnabled = v;
            if (!v) stopMusic();
        }
    };
})();
