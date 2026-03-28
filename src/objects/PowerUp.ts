import Phaser from 'phaser';
import { POWERUP_SIZE, COLORS } from '../constants.ts';

export type PowerUpType =
    | 'multiball'
    | 'slow_opponent'
    | 'speed_boost'
    | 'big_paddle'
    | 'shrink_opponent'
    | 'fireball'
    | 'shield';

export const POWERUP_COLORS: Record<PowerUpType, number> = {
    multiball: COLORS.NEON_YELLOW,
    slow_opponent: COLORS.NEON_RED,
    speed_boost: COLORS.NEON_GREEN,
    big_paddle: COLORS.NEON_CYAN,
    shrink_opponent: COLORS.NEON_ORANGE,
    fireball: COLORS.NEON_RED,
    shield: COLORS.NEON_MAGENTA,
};

export const POWERUP_SYMBOLS: Record<PowerUpType, string> = {
    multiball: '×10',
    slow_opponent: 'SLO',
    speed_boost: 'SPD',
    big_paddle: 'BIG',
    shrink_opponent: 'SHR',
    fireball: 'FIR',
    shield: 'SHD',
};

export class PowerUp extends Phaser.GameObjects.Container {
    declare body: Phaser.Physics.Arcade.Body;

    public powerType: PowerUpType;
    private bg: Phaser.GameObjects.Arc;
    private label: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, type: PowerUpType) {
        super(scene, x, y);
        this.powerType = type;

        const color = POWERUP_COLORS[type];

        // Background circle
        this.bg = scene.add.arc(0, 0, POWERUP_SIZE / 2, 0, 360, false, color, 0.8);
        this.add(this.bg);

        // Label
        this.label = scene.add.text(0, 0, POWERUP_SYMBOLS[type], {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#000000',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add(this.label);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCircle(POWERUP_SIZE / 2, -POWERUP_SIZE / 2, -POWERUP_SIZE / 2);

        // Slow drift
        const angle = Math.random() * Math.PI * 2;
        this.body.setVelocity(Math.cos(angle) * 40, Math.sin(angle) * 40);
        this.body.setBounce(1, 1);
        this.body.setCollideWorldBounds(true);

        // Pulsing animation
        scene.tweens.add({
            targets: this.bg,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }
}
