export class AudioManager {
    constructor() {
        this.ctx = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicPlaying = false;
        this.musicElement = null;
        this.musicSource = null;
        this.initialized = false;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.musicLoaded = false;
        this.pendingMusicSrc = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.ctx.destination);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.ctx.destination);
            this.initialized = true;
            this._loadMusic(this.pendingMusicSrc);
            this.pendingMusicSrc = null;
        } catch (e) {
            console.warn('Web Audio not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                // Context just resumed — restart music if it should be playing
                if (this.musicPlaying && this.musicElement && this.musicElement.paused) {
                    this.musicElement.play().catch(() => {});
                }
            });
        }
    }

    _loadMusic(src) {
        if (this.musicElement) return;
        this.currentMusicSrc = src || 'assets/music.mp3';
        this.musicElement = new window.Audio(this.currentMusicSrc);
        this.musicElement.loop = true;
        this.musicElement.preload = 'auto';
        this.musicSource = this.ctx.createMediaElementSource(this.musicElement);
        this.musicSource.connect(this.musicGain);
        this.musicElement.addEventListener('canplaythrough', () => {
            this.musicLoaded = true;
        }, { once: true });
    }

    switchMusic(src) {
        if (!this.initialized) {
            this.pendingMusicSrc = src;
            return;
        }
        if (this.currentMusicSrc === src) return;
        this.currentMusicSrc = src;
        if (this.musicElement) {
            this.musicElement.pause();
            this.musicElement.src = src;
            this.musicElement.load();
            if (this.musicPlaying) {
                this.musicElement.play().catch(() => {});
            }
        }
    }

    // ========== MUSIC ==========
    startMusic() {
        if (!this.initialized) return;
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        if (this.musicElement) {
            this.musicElement.play().catch(() => {});
        }
    }

    ensureMusic() {
        if (!this.initialized) return;
        this.resume();
        if (!this.musicPlaying) {
            this.startMusic();
        } else if (this.musicElement && this.musicElement.paused) {
            // musicPlaying is true but element is paused (failed earlier)
            this.musicElement.play().catch(() => {});
        }
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicElement) {
            this.musicElement.pause();
        }
    }

    // ========== SFX ==========
    _playSfx(setup) {
        if (!this.initialized) return;
        this.resume();
        try { setup(this.ctx, this.sfxGain); } catch (e) {}
    }

    playArrowShot() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 0.08;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3)) * 0.3;
            }
            const src = ctx.createBufferSource();
            const filter = ctx.createBiquadFilter();
            src.buffer = buf;
            filter.type = 'bandpass';
            filter.frequency.value = 2000;
            filter.Q.value = 2;
            src.connect(filter);
            filter.connect(dest);
            src.start(now);
        });
    }

    playMagicShot() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    playCannonShot() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.4);
            // Noise burst
            const bufSize = ctx.sampleRate * 0.12;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15)) * 0.15;
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(dest);
            src.start(now);
        });
    }

    playFrostShot() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.2);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.3);
        });
    }

    playTeslaZap() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 0.15;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                const t = i / ctx.sampleRate;
                d[i] = (Math.random() * 2 - 1) * Math.sin(t * 3000) * Math.exp(-i / (bufSize * 0.3)) * 0.2;
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(dest);
            src.start(now);
        });
    }

    playEnemyHit() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.1);
        });
    }

    playEnemyDeath() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.35);
        });
    }

    playTowerPlace() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [440, 554, 659];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = now + i * 0.08;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.25);
            });
        });
    }

    playTowerUpgrade() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = now + i * 0.07;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.25);
            });
        });
    }

    playWaveStart() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [392, 523, 659];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = now + i * 0.12;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.15, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.55);
            });
        });
    }

    playGoldEarn() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.setValueAtTime(1600, now + 0.04);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.15);
        });
    }

    playHeroAttack() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const bufSize = ctx.sampleRate * 0.1;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25)) * 0.15;
            }
            const src = ctx.createBufferSource();
            const filter = ctx.createBiquadFilter();
            src.buffer = buf;
            filter.type = 'highpass';
            filter.frequency.value = 3000;
            src.connect(filter);
            filter.connect(dest);
            src.start(now);
        });
    }

    playHeroDeath() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [440, 370, 294, 220];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = now + i * 0.2;
                gain.gain.setValueAtTime(0.12, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.35);
            });
        });
    }

    playButtonClick() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(dest);
            osc.start(now);
            osc.stop(now + 0.06);
        });
    }

    playBossSpawn() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            osc1.type = 'sawtooth';
            osc2.type = 'sawtooth';
            osc1.frequency.value = 110;
            osc2.frequency.value = 112;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
            gain.gain.setValueAtTime(0.12, now + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(dest);
            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 1.6);
            osc2.stop(now + 1.6);
            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'triangle';
            osc3.frequency.setValueAtTime(220, now + 0.3);
            osc3.frequency.setValueAtTime(330, now + 0.5);
            gain3.gain.setValueAtTime(0, now + 0.3);
            gain3.gain.linearRampToValueAtTime(0.08, now + 0.4);
            gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            osc3.connect(gain3);
            gain3.connect(dest);
            osc3.start(now + 0.3);
            osc3.stop(now + 1.1);
        });
    }

    playCheckpoint() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [523, 659, 784, 1047, 784, 1047];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = now + i * 0.1;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.1, t + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.4);
            });
        });
    }

    playVictory() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                const t = now + i * 0.15;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.55);
            });
        });
    }

    playDefeat() {
        this._playSfx((ctx, dest) => {
            const now = ctx.currentTime;
            const notes = [392, 349, 294, 262, 220, 196];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = now + i * 0.25;
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(t);
                osc.stop(t + 0.45);
            });
        });
    }

    playTowerShot(type) {
        switch (type) {
            case 'archer': this.playArrowShot(); break;
            case 'mage': this.playMagicShot(); break;
            case 'cannon': this.playCannonShot(); break;
            case 'frost': this.playFrostShot(); break;
            case 'tesla': this.playTeslaZap(); break;
        }
    }

    setMusicVolume(v) {
        this.musicVolume = v;
        if (this.musicGain) this.musicGain.gain.value = v;
    }

    setSfxVolume(v) {
        this.sfxVolume = v;
        if (this.sfxGain) this.sfxGain.gain.value = v;
    }
}

// Global singleton
export const Audio = new AudioManager();
