import Phaser from 'phaser';
import { BALL_SIZE, BALL_SPEED_INITIAL, BALL_SPEED_INCREMENT, BALL_SPEED_MAX } from '../constants.ts';

export class Ball extends Phaser.GameObjects.Arc {
    declare body: Phaser.Physics.Arcade.Body;

    public currentSpeed: number = BALL_SPEED_INITIAL;
    public isFireball: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, color: number = 0xffffff) {
        super(scene, x, y, BALL_SIZE / 2, 0, 360, false, color);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setCircle(BALL_SIZE / 2);
        this.body.setBounce(1, 1);
        this.body.setCollideWorldBounds(true);
        this.body.setMaxVelocity(BALL_SPEED_MAX, BALL_SPEED_MAX);
    }

    /** Launch ball in a random direction */
    launch(direction?: number): void {
        this.currentSpeed = BALL_SPEED_INITIAL;

        // Random angle between -45 and 45 degrees from the given direction
        const baseAngle = direction ?? (Math.random() > 0.5 ? 0 : Math.PI);
        const spread = (Math.random() - 0.5) * (Math.PI / 3); // +/- 30 degrees
        const angle = baseAngle + spread;

        this.body.setVelocity(
            Math.cos(angle) * this.currentSpeed,
            Math.sin(angle) * this.currentSpeed,
        );
    }

    /** Increase speed after a paddle hit */
    increaseSpeed(): void {
        this.currentSpeed = Math.min(this.currentSpeed + BALL_SPEED_INCREMENT, BALL_SPEED_MAX);
        // Maintain direction, adjust magnitude
        const vel = this.body.velocity;
        const currentMag = vel.length();
        if (currentMag > 0) {
            const scale = this.currentSpeed / currentMag;
            this.body.setVelocity(vel.x * scale, vel.y * scale);
        }
    }

    /** Reset ball to center */
    reset(x: number, y: number): void {
        this.setPosition(x, y);
        this.body.setVelocity(0, 0);
        this.currentSpeed = BALL_SPEED_INITIAL;
        this.isFireball = false;
    }
}
