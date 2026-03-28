import Phaser from 'phaser';
import {
    SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS,
    GameMode, InputType, PlayerConfig,
} from '../constants.ts';

const INPUT_OPTIONS: { label: string; value: InputType }[] = [
    { label: 'KEYBOARD', value: 'keyboard' },
    { label: 'GAMEPAD', value: 'gamepad' },
    { label: 'CPU EASY', value: 'cpu-easy' },
    { label: 'CPU MED', value: 'cpu-medium' },
    { label: 'CPU HARD', value: 'cpu-hard' },
];

const SLOT_COLORS = ['#00ffff', '#ff00ff', '#00ff88', '#ff8800'];
const SLOT_LABELS = ['PLAYER 1', 'PLAYER 2', 'PLAYER 3', 'PLAYER 4'];
const DEFAULT_KEYS = ['W / S', '↑ / ↓', 'I / K', 'Num 8 / 5'];

export class LobbyScene extends Phaser.Scene {
    private playerCount: number = 2;
    private playerInputs: InputType[] = ['keyboard', 'keyboard', 'cpu-medium', 'cpu-medium'];
    private gameMode: GameMode = 'modern';
    private slotTexts: Phaser.GameObjects.Text[] = [];
    private playerCountText!: Phaser.GameObjects.Text;
    private gameModeText!: Phaser.GameObjects.Text;
    private slotContainers: Phaser.GameObjects.Container[] = [];

    constructor() {
        super(SCENES.LOBBY);
    }

    create(): void {
        const cx = GAME_WIDTH / 2;

        // Title
        this.add.text(cx, 50, 'MULTIPLAYER SETUP', {
            fontFamily: 'monospace', fontSize: '40px', color: '#ff00ff', fontStyle: 'bold',
        }).setOrigin(0.5);

        // ── Player Count ──
        this.add.text(cx, 115, 'PLAYERS', {
            fontFamily: 'monospace', fontSize: '18px', color: '#888888',
        }).setOrigin(0.5);

        const countRow = 140;
        this.createArrowButton(cx - 90, countRow, '<', () => this.changePlayerCount(-1));
        this.playerCountText = this.add.text(cx, countRow, String(this.playerCount), {
            fontFamily: 'monospace', fontSize: '32px', color: '#ffffff',
        }).setOrigin(0.5);
        this.createArrowButton(cx + 90, countRow, '>', () => this.changePlayerCount(1));

        // ── Game Mode ──
        this.add.text(cx, 190, 'GAME MODE', {
            fontFamily: 'monospace', fontSize: '18px', color: '#888888',
        }).setOrigin(0.5);

        const modeRow = 218;
        this.createArrowButton(cx - 110, modeRow, '<', () => this.toggleMode());
        this.gameModeText = this.add.text(cx, modeRow, this.gameMode.toUpperCase(), {
            fontFamily: 'monospace', fontSize: '26px', color: '#00ffff',
        }).setOrigin(0.5);
        this.createArrowButton(cx + 110, modeRow, '>', () => this.toggleMode());

        // ── Player Slots ──
        this.rebuildSlots();

        // ── Start Button ──
        const startY = GAME_HEIGHT - 80;
        const startBg = this.add.rectangle(cx, startY, 300, 56, 0x112222, 0.9)
            .setStrokeStyle(2, COLORS.NEON_GREEN)
            .setInteractive({ useHandCursor: true });

        this.add.text(cx, startY, 'START GAME', {
            fontFamily: 'monospace', fontSize: '28px', color: '#00ff88', fontStyle: 'bold',
        }).setOrigin(0.5);

        startBg.on('pointerover', () => startBg.setFillStyle(0x224444, 1));
        startBg.on('pointerout', () => startBg.setFillStyle(0x112222, 0.9));
        startBg.on('pointerdown', () => this.startGame());

        // ── Back Button ──
        const backBg = this.add.rectangle(100, GAME_HEIGHT - 80, 140, 40, 0x111122, 0.8)
            .setStrokeStyle(1, 0x888888)
            .setInteractive({ useHandCursor: true });
        this.add.text(100, GAME_HEIGHT - 80, '← BACK', {
            fontFamily: 'monospace', fontSize: '16px', color: '#888888',
        }).setOrigin(0.5);
        backBg.on('pointerdown', () => this.scene.start(SCENES.MENU));

        // ESC to go back
        this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.MENU));
    }

    // ── UI Builders ──

    private createArrowButton(x: number, y: number, label: string, onClick: () => void): void {
        const btn = this.add.text(x, y, label, {
            fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setColor('#00ffff'));
        btn.on('pointerout', () => btn.setColor('#ffffff'));
        btn.on('pointerdown', onClick);
    }

    private rebuildSlots(): void {
        // Clear old
        for (const c of this.slotContainers) c.destroy();
        this.slotContainers = [];
        this.slotTexts = [];

        const startY = 275;
        const slotH = 80;
        const cx = GAME_WIDTH / 2;

        for (let i = 0; i < this.playerCount; i++) {
            const y = startY + i * slotH;
            const container = this.add.container(0, 0);

            // Slot background
            const bg = this.add.rectangle(cx, y, 520, 62, 0x111122, 0.7)
                .setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(SLOT_COLORS[i]).color);
            container.add(bg);

            // Player label
            const label = this.add.text(cx - 220, y, SLOT_LABELS[i], {
                fontFamily: 'monospace', fontSize: '20px', color: SLOT_COLORS[i], fontStyle: 'bold',
            }).setOrigin(0, 0.5);
            container.add(label);

            // Input type selector
            this.createArrowButtonInContainer(container, cx + 30, y, '<', () => this.cycleInput(i, -1));
            const inputText = this.add.text(cx + 120, y, this.getInputLabel(i), {
                fontFamily: 'monospace', fontSize: '18px', color: '#ffffff',
            }).setOrigin(0.5);
            container.add(inputText);
            this.slotTexts.push(inputText);
            this.createArrowButtonInContainer(container, cx + 210, y, '>', () => this.cycleInput(i, 1));

            // Key hint for keyboard
            if (this.playerInputs[i] === 'keyboard') {
                const hint = this.add.text(cx - 220, y + 18, DEFAULT_KEYS[i], {
                    fontFamily: 'monospace', fontSize: '11px', color: '#555555',
                }).setOrigin(0, 0.5);
                container.add(hint);
            }

            this.slotContainers.push(container);
        }
    }

    private createArrowButtonInContainer(container: Phaser.GameObjects.Container, x: number, y: number, label: string, onClick: () => void): void {
        const btn = this.add.text(x, y, label, {
            fontFamily: 'monospace', fontSize: '22px', color: '#aaaaaa',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setColor('#ffffff'));
        btn.on('pointerout', () => btn.setColor('#aaaaaa'));
        btn.on('pointerdown', onClick);
        container.add(btn);
    }

    // ── Actions ──

    private changePlayerCount(delta: number): void {
        this.playerCount = Phaser.Math.Clamp(this.playerCount + delta, 2, 4);
        this.playerCountText.setText(String(this.playerCount));
        this.rebuildSlots();
    }

    private toggleMode(): void {
        this.gameMode = this.gameMode === 'modern' ? 'standard' : 'modern';
        this.gameModeText.setText(this.gameMode.toUpperCase());
        this.gameModeText.setColor(this.gameMode === 'modern' ? '#00ffff' : '#33ff33');
    }

    private cycleInput(playerIndex: number, dir: number): void {
        const current = INPUT_OPTIONS.findIndex(o => o.value === this.playerInputs[playerIndex]);
        const next = (current + dir + INPUT_OPTIONS.length) % INPUT_OPTIONS.length;
        this.playerInputs[playerIndex] = INPUT_OPTIONS[next].value;
        this.slotTexts[playerIndex].setText(this.getInputLabel(playerIndex));
        this.rebuildSlots(); // rebuild to update key hints
    }

    private getInputLabel(playerIndex: number): string {
        const opt = INPUT_OPTIONS.find(o => o.value === this.playerInputs[playerIndex]);
        return opt?.label ?? 'KEYBOARD';
    }

    private startGame(): void {
        const players: PlayerConfig[] = [];
        for (let i = 0; i < this.playerCount; i++) {
            const it = this.playerInputs[i];
            let label: string;
            if (it === 'keyboard') label = `P${i + 1}`;
            else if (it === 'gamepad') label = `P${i + 1} (Pad)`;
            else label = `CPU (${it.replace('cpu-', '').toUpperCase()})`;

            players.push({ inputType: it, label });
        }

        this.scene.start(SCENES.GAME, {
            mode: this.playerCount > 2 ? 'multiplayer' : this.gameMode,
            playerCount: this.playerCount,
            players,
        });
    }
}
