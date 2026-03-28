/**
 * Generates sound effects procedurally using the Web Audio API.
 * No audio files needed.
 */
export class AudioManager {
    private ctx: AudioContext | null = null;
    private isRetro: boolean;

    constructor(isRetro: boolean = true) {
        this.isRetro = isRetro;
    }

    private getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        return this.ctx;
    }

    playHit(): void {
        if (this.isRetro) {
            this.playTone(440, 0.05, 'square');
        } else {
            this.playTone(660, 0.08, 'sine', 0.3);
            this.playTone(880, 0.06, 'sine', 0.15);
        }
    }

    playWall(): void {
        if (this.isRetro) {
            this.playTone(300, 0.03, 'square');
        } else {
            this.playTone(220, 0.06, 'triangle', 0.2);
        }
    }

    playScore(): void {
        if (this.isRetro) {
            this.playTone(200, 0.15, 'square');
        } else {
            this.playTone(330, 0.1, 'sine', 0.3);
            setTimeout(() => this.playTone(440, 0.1, 'sine', 0.25), 100);
            setTimeout(() => this.playTone(550, 0.15, 'sine', 0.2), 200);
        }
    }

    playPowerUp(): void {
        this.playTone(500, 0.05, 'sine', 0.3);
        setTimeout(() => this.playTone(700, 0.05, 'sine', 0.25), 50);
        setTimeout(() => this.playTone(900, 0.08, 'sine', 0.2), 100);
    }

    playGameOver(): void {
        if (this.isRetro) {
            this.playTone(400, 0.15, 'square');
            setTimeout(() => this.playTone(300, 0.15, 'square'), 150);
            setTimeout(() => this.playTone(200, 0.3, 'square'), 300);
        } else {
            this.playTone(600, 0.15, 'sine', 0.3);
            setTimeout(() => this.playTone(500, 0.15, 'sine', 0.25), 150);
            setTimeout(() => this.playTone(350, 0.3, 'sine', 0.2), 300);
        }
    }

    private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume: number = 0.15): void {
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch {
            // Audio not available
        }
    }

    destroy(): void {
        this.ctx?.close();
        this.ctx = null;
    }
}
