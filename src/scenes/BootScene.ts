import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../constants.ts';

export class BootScene extends Phaser.Scene {
    constructor() {
        super(SCENES.BOOT);
    }

    preload(): void {
        // Create a simple loading bar
        const barW = 400;
        const barH = 20;
        const barX = (GAME_WIDTH - barW) / 2;
        const barY = GAME_HEIGHT / 2;

        const bg = this.add.rectangle(GAME_WIDTH / 2, barY, barW, barH, 0x222222);
        const bar = this.add.rectangle(barX, barY, 0, barH, COLORS.NEON_CYAN).setOrigin(0, 0.5);

        this.load.on('progress', (value: number) => {
            bar.width = barW * value;
        });

        this.load.on('complete', () => {
            bg.destroy();
            bar.destroy();
        });

        // We generate all graphics procedurally, so nothing to load for now.
        // Future: load audio, fonts, etc.
    }

    create(): void {
        this.scene.start(SCENES.MENU);
    }
}
