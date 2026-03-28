import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS, GameMode } from '../constants.ts';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super(SCENES.MENU);
    }

    create(): void {
        const cx = GAME_WIDTH / 2;

        // Title
        this.add.text(cx, 100, 'VECTOR PONG', {
            fontFamily: 'monospace',
            fontSize: '64px',
            color: '#00ffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(cx, 170, 'Choose your mode', {
            fontFamily: 'monospace',
            fontSize: '20px',
            color: '#888888',
        }).setOrigin(0.5);

        // Mode buttons
        const modes: { label: string; mode: GameMode; color: string; y: number; desc: string }[] = [
            { label: 'STANDARD', mode: 'standard', color: '#33ff33', y: 300, desc: 'Classic retro pong \u2022 1v1' },
            { label: 'MODERN', mode: 'modern', color: '#00ffff', y: 400, desc: 'Neon visuals & power-ups \u2022 1v1' },
            { label: 'MULTIPLAYER', mode: 'multiplayer', color: '#ff00ff', y: 500, desc: 'Up to 4 players \u2022 Free-for-all' },
        ];

        for (const m of modes) {
            this.createMenuButton(cx, m.y, m.label, m.desc, m.color, m.mode);
        }

        // Controls hint
        this.add.text(cx, GAME_HEIGHT - 40, 'P1: W/S  \u2022  P2: \u2191/\u2193  \u2022  Gamepad supported', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#555555',
        }).setOrigin(0.5);
    }

    private createMenuButton(x: number, y: number, label: string, desc: string, color: string, mode: GameMode): void {
        const btnW = 360;
        const btnH = 60;

        const bg = this.add.rectangle(x, y, btnW, btnH, 0x111122, 0.8)
            .setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color)
            .setInteractive({ useHandCursor: true });

        const text = this.add.text(x, y - 6, label, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: color,
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const descText = this.add.text(x, y + 20, desc, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888',
        }).setOrigin(0.5);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x222244, 1);
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x111122, 0.8);
        });
        bg.on('pointerdown', () => {
            this.startGame(mode);
        });
    }

    private startGame(mode: GameMode): void {
        this.scene.start(SCENES.GAME, { mode, playerCount: mode === 'multiplayer' ? 4 : 2 });
    }
}
