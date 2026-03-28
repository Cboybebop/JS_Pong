import Phaser from 'phaser';
import { PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED, GAME_WIDTH, GAME_HEIGHT } from '../constants.ts';

export type PaddleOrientation = 'vertical' | 'horizontal';

export class Paddle extends Phaser.GameObjects.Rectangle {
    declare body: Phaser.Physics.Arcade.Body;

    public playerIndex: number;
    public baseSpeed: number = PADDLE_SPEED;
    public speedMultiplier: number = 1;
    public orientation: PaddleOrientation;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        playerIndex: number,
        color: number = 0xffffff,
        orientation: PaddleOrientation = 'vertical',
    ) {
        const w = orientation === 'vertical' ? PADDLE_WIDTH : PADDLE_HEIGHT;
        const h = orientation === 'vertical' ? PADDLE_HEIGHT : PADDLE_WIDTH;
        super(scene, x, y, w, h, color);

        this.playerIndex = playerIndex;
        this.orientation = orientation;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.body.setImmovable(true);
        this.body.setCollideWorldBounds(true);
    }

    /** Move paddle based on normalized input (-1 to 1) */
    move(input: number): void {
        const speed = this.baseSpeed * this.speedMultiplier;

        if (this.orientation === 'vertical') {
            this.body.setVelocityY(input * speed);
        } else {
            this.body.setVelocityX(input * speed);
        }
    }

    /** Reset paddle to center of its axis */
    resetPosition(x: number, y: number): void {
        this.setPosition(x, y);
        this.body.setVelocity(0, 0);
    }

    /** Resize paddle (for power-ups) */
    setScale(scaleX: number, scaleY?: number): this {
        super.setScale(scaleX, scaleY);
        this.body.setSize(this.displayWidth, this.displayHeight);
        return this;
    }
}
