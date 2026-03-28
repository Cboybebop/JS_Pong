import Phaser from 'phaser';
import { PowerUp, PowerUpType } from '../objects/PowerUp.ts';
import { Paddle } from '../objects/Paddle.ts';
import { Ball } from '../objects/Ball.ts';
import { AudioManager } from './AudioManager.ts';
import {
    GAME_WIDTH, GAME_HEIGHT,
    POWERUP_SPAWN_INTERVAL, POWERUP_DURATION,
    BALL_SIZE, COLORS,
} from '../constants.ts';

const ALL_POWERUP_TYPES: PowerUpType[] = [
    'multiball', 'slow_opponent', 'speed_boost',
    'big_paddle', 'shrink_opponent', 'fireball', 'shield',
];

export class PowerUpManager {
    private scene: Phaser.Scene;
    private powerUps: PowerUp[] = [];
    private spawnTimer?: Phaser.Time.TimerEvent;
    private activeEffects: Map<string, Phaser.Time.TimerEvent> = new Map();
    private balls: Ball[];
    private paddles: Paddle[];
    private audio: AudioManager;
    private shields: Phaser.GameObjects.Rectangle[] = [];

    constructor(scene: Phaser.Scene, balls: Ball[], paddles: Paddle[], audio: AudioManager) {
        this.scene = scene;
        this.balls = balls;
        this.paddles = paddles;
        this.audio = audio;

        this.startSpawning();
    }

    private startSpawning(): void {
        this.spawnTimer = this.scene.time.addEvent({
            delay: POWERUP_SPAWN_INTERVAL,
            callback: this.spawnRandom,
            callbackScope: this,
            loop: true,
        });
    }

    private spawnRandom(): void {
        // Max 2 power-ups on screen
        if (this.powerUps.length >= 2) return;

        const type = ALL_POWERUP_TYPES[Math.floor(Math.random() * ALL_POWERUP_TYPES.length)];
        const x = GAME_WIDTH / 2 + (Math.random() - 0.5) * 200;
        const y = GAME_HEIGHT / 2 + (Math.random() - 0.5) * 200;

        const powerUp = new PowerUp(this.scene, x, y, type);
        this.powerUps.push(powerUp);

        // Setup overlap with ball(s)
        for (const ball of this.balls) {
            this.scene.physics.add.overlap(ball, powerUp, () => {
                this.collectPowerUp(powerUp, ball);
            });
        }

        // Auto-destroy after 12s if not collected
        this.scene.time.delayedCall(12000, () => {
            this.removePowerUp(powerUp);
        });
    }

    private collectPowerUp(powerUp: PowerUp, ball: Ball): void {
        if (!powerUp.active) return;

        this.audio.playPowerUp();

        // Determine which player "owns" this ball based on direction
        const vel = ball.body.velocity;
        let playerIndex: number;
        if (Math.abs(vel.x) > Math.abs(vel.y)) {
            playerIndex = vel.x > 0 ? 0 : 1; // heading right = P1 hit it
        } else {
            playerIndex = vel.y > 0 ? 2 : 3;
        }
        // Clamp to valid player indices
        playerIndex = Math.min(playerIndex, this.paddles.length - 1);

        this.applyEffect(powerUp.powerType, playerIndex);
        this.removePowerUp(powerUp);
    }

    private applyEffect(type: PowerUpType, playerIndex: number): void {
        const paddle = this.paddles[playerIndex];
        const opponentIndex = playerIndex === 0 ? 1 : 0;
        const opponent = this.paddles[opponentIndex];

        switch (type) {
            case 'speed_boost':
                paddle.speedMultiplier = 2;
                this.scheduleRevert(`speed_${playerIndex}`, POWERUP_DURATION.SPEED_BOOST, () => {
                    paddle.speedMultiplier = 1;
                });
                break;

            case 'slow_opponent':
                if (opponent) {
                    opponent.speedMultiplier = 0.5;
                    this.scheduleRevert(`slow_${opponentIndex}`, POWERUP_DURATION.SLOW_OPPONENT, () => {
                        opponent.speedMultiplier = 1;
                    });
                }
                break;

            case 'big_paddle':
                if (paddle.orientation === 'vertical') {
                    paddle.setScale(1, 1.5);
                } else {
                    paddle.setScale(1.5, 1);
                }
                this.scheduleRevert(`big_${playerIndex}`, POWERUP_DURATION.BIG_PADDLE, () => {
                    paddle.setScale(1, 1);
                });
                break;

            case 'shrink_opponent':
                if (opponent) {
                    if (opponent.orientation === 'vertical') {
                        opponent.setScale(1, 0.5);
                    } else {
                        opponent.setScale(0.5, 1);
                    }
                    this.scheduleRevert(`shrink_${opponentIndex}`, POWERUP_DURATION.SHRINK_OPPONENT, () => {
                        opponent.setScale(1, 1);
                    });
                }
                break;

            case 'multiball':
                this.spawnMultiballs();
                break;

            case 'fireball':
                this.balls[0].isFireball = true;
                this.balls[0].setFillStyle(COLORS.NEON_RED);
                break;

            case 'shield':
                this.createShield(playerIndex);
                break;
        }
    }

    private spawnMultiballs(): void {
        const mainBall = this.balls[0];
        for (let i = 0; i < 9; i++) {
            const extra = new Ball(
                this.scene,
                mainBall.x + (Math.random() - 0.5) * 20,
                mainBall.y + (Math.random() - 0.5) * 20,
                COLORS.NEON_YELLOW,
            );
            extra.launch();
            this.balls.push(extra);

            // Setup collisions with paddles
            for (const paddle of this.paddles) {
                this.scene.physics.add.collider(extra, paddle);
            }
        }

        // Remove extra balls after duration
        this.scene.time.delayedCall(POWERUP_DURATION.MULTIBALL, () => {
            while (this.balls.length > 1) {
                const b = this.balls.pop()!;
                b.destroy();
            }
        });
    }

    private createShield(playerIndex: number): void {
        const paddle = this.paddles[playerIndex];
        let shield: Phaser.GameObjects.Rectangle;

        if (paddle.orientation === 'vertical') {
            const x = playerIndex === 0 ? 8 : GAME_WIDTH - 8;
            shield = this.scene.add.rectangle(x, GAME_HEIGHT / 2, 6, GAME_HEIGHT, COLORS.NEON_MAGENTA, 0.5);
        } else {
            const y = playerIndex === 2 ? 8 : GAME_HEIGHT - 8;
            shield = this.scene.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH, 6, COLORS.NEON_MAGENTA, 0.5);
        }

        this.scene.physics.add.existing(shield, true); // static body
        this.shields.push(shield);

        // Collide balls with shield
        for (const ball of this.balls) {
            this.scene.physics.add.collider(ball, shield);
        }

        this.scene.time.delayedCall(POWERUP_DURATION.SHIELD, () => {
            shield.destroy();
            const idx = this.shields.indexOf(shield);
            if (idx >= 0) this.shields.splice(idx, 1);
        });
    }

    private scheduleRevert(key: string, delay: number, revert: () => void): void {
        // Cancel existing timer for same effect
        const existing = this.activeEffects.get(key);
        if (existing) existing.destroy();

        const timer = this.scene.time.delayedCall(delay, () => {
            revert();
            this.activeEffects.delete(key);
        });
        this.activeEffects.set(key, timer);
    }

    private removePowerUp(powerUp: PowerUp): void {
        if (!powerUp.active) return;
        powerUp.destroy();
        const idx = this.powerUps.indexOf(powerUp);
        if (idx >= 0) this.powerUps.splice(idx, 1);
    }

    destroy(): void {
        this.spawnTimer?.destroy();
        for (const pu of this.powerUps) pu.destroy();
        for (const s of this.shields) s.destroy();
        this.powerUps = [];
        this.shields = [];
        this.activeEffects.forEach(t => t.destroy());
        this.activeEffects.clear();
    }
}
