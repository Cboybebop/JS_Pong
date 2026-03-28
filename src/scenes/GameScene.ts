import Phaser from 'phaser';
import {
    SCENES, GAME_WIDTH, GAME_HEIGHT, COLORS,
    PADDLE_MARGIN, SCORE_TO_WIN, GameMode, PlayerConfig, InputType,
} from '../constants.ts';
import { Paddle } from '../objects/Paddle.ts';
import { Ball } from '../objects/Ball.ts';
import { InputManager } from '../managers/InputManager.ts';
import { AudioManager } from '../managers/AudioManager.ts';
import { PowerUpManager } from '../managers/PowerUpManager.ts';
import { CPUController } from '../managers/CPUController.ts';

interface GameSceneData {
    mode: GameMode;
    playerCount: number;
    players?: PlayerConfig[];
}

export class GameScene extends Phaser.Scene {
    // Mode
    private mode: GameMode = 'standard';
    private playerCount: number = 2;
    private playerConfigs: PlayerConfig[] = [];

    // Game objects
    private paddles: Paddle[] = [];
    private ball!: Ball;
    private allBalls: Ball[] = []; // for multiball tracking
    private inputManager!: InputManager;
    private cpuControllers: Map<number, CPUController> = new Map();
    private powerUpManager?: PowerUpManager;

    // Scoring
    private scores: number[] = [];
    private scoreTexts: Phaser.GameObjects.Text[] = [];
    private scoreToWin: number = SCORE_TO_WIN;

    // State
    private gameStartTime: number = 0;
    private isServing: boolean = true;
    private serveTimer?: Phaser.Time.TimerEvent;

    // Audio
    private audio!: AudioManager;

    // Visuals
    private centerLine?: Phaser.GameObjects.Graphics;
    private scanlineOverlay?: Phaser.GameObjects.Graphics;
    private ballTrailEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super(SCENES.GAME);
    }

    init(data: GameSceneData): void {
        this.mode = data.mode || 'standard';
        this.playerCount = data.playerCount || 2;
        this.playerConfigs = data.players || this.defaultPlayerConfigs();
        this.scores = new Array(this.playerCount).fill(0);
        this.paddles = [];
        this.scoreTexts = [];
        this.cpuControllers = new Map();
        this.isServing = true;
    }

    /** Default configs when launched directly (Standard/Modern from menu) */
    private defaultPlayerConfigs(): PlayerConfig[] {
        return [
            { inputType: 'keyboard', label: 'P1' },
            { inputType: 'cpu-medium', label: 'CPU (MED)' },
        ];
    }

    create(): void {
        this.gameStartTime = this.time.now;
        this.audio = new AudioManager(this.mode === 'standard');

        // Set background based on mode
        const bgColor = this.mode === 'standard' ? COLORS.RETRO_BG : COLORS.MODERN_BG;
        this.cameras.main.setBackgroundColor(bgColor);

        // Disable world bounds on scoring edges based on mode
        this.setupWorldBounds();

        // Create center line
        this.drawCenterLine();

        // Create paddles
        this.createPaddles();

        // Create ball
        this.createBall();

        // Create HUD
        this.createHUD();

        // Track all balls
        this.allBalls = [this.ball];

        // Setup collisions
        this.setupCollisions();

        // Setup input (only for human players)
        this.inputManager = new InputManager(this, this.playerCount);

        // Setup CPU controllers for CPU players
        for (const paddle of this.paddles) {
            const config = this.playerConfigs[paddle.playerIndex];
            if (config && config.inputType.startsWith('cpu')) {
                this.cpuControllers.set(
                    paddle.playerIndex,
                    new CPUController(this, paddle, config.inputType)
                );
            }
        }

        // Power-ups for modern/multiplayer
        if (this.mode !== 'standard') {
            this.powerUpManager = new PowerUpManager(this, this.allBalls, this.paddles, this.audio);
        }

        // Modern mode visual effects
        if (this.mode !== 'standard') {
            this.setupModernEffects();
        }

        // CRT scanline overlay for retro mode
        if (this.mode === 'standard') {
            this.createScanlines();
        }

        // Ball wall bounce sound
        this.ball.body.onWorldBounds = true;
        this.physics.world.on('worldbounds', () => {
            this.audio.playWall();
        });

        // Pause key
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.start(SCENES.MENU);
        });

        // Start serving
        this.serve();
    }

    update(): void {
        // Process paddle input
        for (const paddle of this.paddles) {
            const cpu = this.cpuControllers.get(paddle.playerIndex);
            if (cpu) {
                // CPU-controlled paddle
                paddle.move(cpu.update(this.allBalls));
            } else {
                // Human-controlled paddle
                const input = this.inputManager.getInput(paddle.playerIndex);
                paddle.move(input.movement);
            }
        }

        // Check scoring (ball out of bounds)
        this.checkScoring();
    }

    // ── Setup Methods ─────────────────────────────────────────

    private setupWorldBounds(): void {
        // For standard/modern 1v1: disable left/right walls so ball can go out for scoring
        // Top and bottom walls remain active for bouncing
        if (this.mode === 'multiplayer') {
            // Multiplayer: all edges are scoring zones, no world bounds
            this.physics.world.setBoundsCollision(false, false, false, false);
        } else {
            // 1v1: top/bottom bounce, left/right are scoring zones
            this.physics.world.setBoundsCollision(false, false, true, true);
        }
    }

    private drawCenterLine(): void {
        const gfx = this.add.graphics();
        const isModern = this.mode !== 'standard';
        const color = isModern ? 0x334466 : COLORS.RETRO_DIM;
        const alpha = isModern ? 0.6 : 0.5;
        gfx.lineStyle(2, color, alpha);

        // Border lines for modern mode
        if (isModern) {
            gfx.lineStyle(1, 0x223355, 0.4);
            gfx.strokeRect(4, 4, GAME_WIDTH - 8, GAME_HEIGHT - 8);
            gfx.lineStyle(2, color, alpha);
        }

        if (this.mode === 'multiplayer') {
            // Draw cross
            gfx.lineBetween(GAME_WIDTH / 2, 0, GAME_WIDTH / 2, GAME_HEIGHT);
            gfx.lineBetween(0, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT / 2);
        } else {
            // Dashed vertical center line
            const dashLen = 16;
            const gap = 12;
            const cx = GAME_WIDTH / 2;
            for (let y = 0; y < GAME_HEIGHT; y += dashLen + gap) {
                gfx.lineBetween(cx, y, cx, Math.min(y + dashLen, GAME_HEIGHT));
            }
        }

        this.centerLine = gfx;
    }

    private createPaddles(): void {
        const fgColor = this.mode === 'standard' ? COLORS.RETRO_FG : COLORS.NEON_CYAN;

        if (this.mode === 'multiplayer') {
            // 4 paddles: left, right, top, bottom
            const colors = COLORS.PLAYER_COLORS;
            // Left (P1)
            this.paddles.push(new Paddle(this, PADDLE_MARGIN, GAME_HEIGHT / 2, 0, colors[0], 'vertical'));
            // Right (P2)
            this.paddles.push(new Paddle(this, GAME_WIDTH - PADDLE_MARGIN, GAME_HEIGHT / 2, 1, colors[1], 'vertical'));
            // Top (P3)
            this.paddles.push(new Paddle(this, GAME_WIDTH / 2, PADDLE_MARGIN, 2, colors[2], 'horizontal'));
            // Bottom (P4)
            this.paddles.push(new Paddle(this, GAME_WIDTH / 2, GAME_HEIGHT - PADDLE_MARGIN, 3, colors[3], 'horizontal'));
        } else {
            // 1v1: left and right paddles
            const p2Color = this.mode === 'standard' ? COLORS.RETRO_FG : COLORS.NEON_MAGENTA;
            this.paddles.push(new Paddle(this, PADDLE_MARGIN, GAME_HEIGHT / 2, 0, fgColor, 'vertical'));
            this.paddles.push(new Paddle(this, GAME_WIDTH - PADDLE_MARGIN, GAME_HEIGHT / 2, 1, p2Color, 'vertical'));
        }
    }

    private createBall(): void {
        const color = this.mode === 'standard' ? COLORS.RETRO_FG : COLORS.NEON_WHITE;
        this.ball = new Ball(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, color);
    }

    private createHUD(): void {
        const color = this.mode === 'standard' ? '#33ff33' : '#ffffff';

        if (this.mode === 'multiplayer') {
            // Scores in corners
            const positions = [
                { x: 80, y: 30 },   // P1 top-left
                { x: GAME_WIDTH - 80, y: 30 },  // P2 top-right
                { x: 80, y: GAME_HEIGHT - 30 },  // P3 bottom-left
                { x: GAME_WIDTH - 80, y: GAME_HEIGHT - 30 }, // P4 bottom-right
            ];
            for (let i = 0; i < this.playerCount; i++) {
                const c = '#' + COLORS.PLAYER_COLORS[i].toString(16).padStart(6, '0');
                const text = this.add.text(positions[i].x, positions[i].y, '0', {
                    fontFamily: 'monospace',
                    fontSize: '48px',
                    color: c,
                }).setOrigin(0.5);
                this.scoreTexts.push(text);
            }
        } else {
            // 1v1 scores
            const p1Color = this.mode === 'standard' ? '#33ff33' : '#00ffff';
            const p2Color = this.mode === 'standard' ? '#33ff33' : '#ff00ff';
            this.scoreTexts.push(
                this.add.text(GAME_WIDTH / 2 - 60, 30, '0', {
                    fontFamily: 'monospace',
                    fontSize: '64px',
                    color: p1Color,
                }).setOrigin(1, 0)
            );
            this.scoreTexts.push(
                this.add.text(GAME_WIDTH / 2 + 60, 30, '0', {
                    fontFamily: 'monospace',
                    fontSize: '64px',
                    color: p2Color,
                }).setOrigin(0, 0)
            );
        }
    }

    private setupCollisions(): void {
        for (const paddle of this.paddles) {
            this.physics.add.collider(this.ball, paddle, () => {
                this.onBallHitPaddle(paddle);
            });
        }
    }

    // ── Gameplay Methods ──────────────────────────────────────

    private serve(): void {
        this.isServing = true;
        this.ball.reset(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Brief delay before launching
        this.serveTimer = this.time.delayedCall(800, () => {
            this.ball.launch();
            this.isServing = false;
        });
    }

    private setupModernEffects(): void {
        // Ball particle trail
        this.ballTrailEmitter = this.add.particles(0, 0, undefined, {
            speed: { min: 10, max: 30 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 0.6, end: 0 },
            lifespan: 300,
            frequency: 20,
            tint: this.mode === 'modern' ? COLORS.NEON_CYAN : COLORS.NEON_WHITE,
            follow: this.ball,
        });

        // Apply v4 Filters if available (WebGL only)
        try {
            // Glow on paddles
            for (const paddle of this.paddles) {
                paddle.enableFilters();
                paddle.filters?.internal.addGlow(paddle.fillColor, 4, 0);
            }
            // Glow on ball
            this.ball.enableFilters();
            this.ball.filters?.internal.addGlow(0xffffff, 6, 0);

            // Camera vignette (lighter so it doesn't obscure gameplay)
            this.cameras.main.filters.external.addVignette(0.5, 0.5, 0.6);
        } catch {
            // Filters not available (Canvas fallback) — skip silently
        }
    }

    private createScanlines(): void {
        const gfx = this.add.graphics();
        gfx.setDepth(100);
        for (let y = 0; y < GAME_HEIGHT; y += 4) {
            gfx.fillStyle(0x000000, 0.15);
            gfx.fillRect(0, y, GAME_WIDTH, 2);
        }
        this.scanlineOverlay = gfx;
    }

    private onBallHitPaddle(paddle: Paddle): void {
        this.ball.increaseSpeed();
        this.audio.playHit();

        // Add angle influence based on where ball hits paddle
        const relativeHit = this.getRelativeHitPosition(paddle);
        const vel = this.ball.body.velocity;
        const speed = this.ball.currentSpeed;

        if (paddle.orientation === 'vertical') {
            // Vertical paddle: adjust Y velocity based on hit position
            const maxAngle = Math.PI / 3; // 60 degrees max
            const angle = relativeHit * maxAngle;
            const dir = vel.x > 0 ? 1 : -1;
            this.ball.body.setVelocity(
                dir * speed * Math.cos(angle),
                speed * Math.sin(angle),
            );
        } else {
            // Horizontal paddle: adjust X velocity based on hit position
            const maxAngle = Math.PI / 3;
            const angle = relativeHit * maxAngle;
            const dir = vel.y > 0 ? 1 : -1;
            this.ball.body.setVelocity(
                speed * Math.sin(angle),
                dir * speed * Math.cos(angle),
            );
        }
    }

    private getRelativeHitPosition(paddle: Paddle): number {
        if (paddle.orientation === 'vertical') {
            return (this.ball.y - paddle.y) / (paddle.displayHeight / 2);
        } else {
            return (this.ball.x - paddle.x) / (paddle.displayWidth / 2);
        }
    }

    private checkScoring(): void {
        if (this.isServing) return;

        const bx = this.ball.x;
        const by = this.ball.y;
        let scoringPlayerIndex = -1;

        if (this.mode === 'multiplayer') {
            // Ball out of any edge
            if (bx < -20) scoringPlayerIndex = 0;        // P1 loses (left edge)
            else if (bx > GAME_WIDTH + 20) scoringPlayerIndex = 1;  // P2 loses (right edge)
            else if (by < -20) scoringPlayerIndex = 2;    // P3 loses (top edge)
            else if (by > GAME_HEIGHT + 20) scoringPlayerIndex = 3; // P4 loses (bottom edge)

            if (scoringPlayerIndex >= 0) {
                this.audio.playScore();
                // In multiplayer, everyone except the loser scores
                for (let i = 0; i < this.playerCount; i++) {
                    if (i !== scoringPlayerIndex) {
                        this.scores[i]++;
                    }
                }
                this.updateScoreDisplay();
                this.checkWinCondition();
            }
        } else {
            // 1v1: ball out left = P2 scores, ball out right = P1 scores
            if (bx < -20) {
                this.audio.playScore();
                this.scores[1]++;
                this.updateScoreDisplay();
                this.checkWinCondition();
            } else if (bx > GAME_WIDTH + 20) {
                this.audio.playScore();
                this.scores[0]++;
                this.updateScoreDisplay();
                this.checkWinCondition();
            }
        }
    }

    private updateScoreDisplay(): void {
        for (let i = 0; i < this.scoreTexts.length; i++) {
            this.scoreTexts[i].setText(this.scores[i].toString());
        }
    }

    private checkWinCondition(): void {
        const winnerIndex = this.scores.findIndex(s => s >= this.scoreToWin);

        if (winnerIndex >= 0) {
            this.endGame(winnerIndex);
        } else {
            this.serve();
        }
    }

    private endGame(winnerIndex: number): void {
        const duration = Math.floor((this.time.now - this.gameStartTime) / 1000);
        this.audio.playGameOver();
        this.inputManager.destroy();

        this.scene.start(SCENES.GAME_OVER, {
            winnerIndex,
            scores: [...this.scores],
            mode: this.mode,
            duration,
        });
    }

    shutdown(): void {
        this.inputManager?.destroy();
        this.powerUpManager?.destroy();
        this.audio?.destroy();
    }
}
