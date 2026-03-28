import Phaser from 'phaser';
import { Paddle } from '../objects/Paddle.ts';
import { Ball } from '../objects/Ball.ts';
import { CPU_DIFFICULTY, InputType, GAME_WIDTH, GAME_HEIGHT } from '../constants.ts';

interface CPUSettings {
    reactionDelay: number;
    errorMargin: number;
    speedFactor: number;
    predictionNoise: number;
}

/**
 * Controls a single CPU-driven paddle.
 * Tracks the ball and moves the paddle toward a predicted intercept point,
 * with accuracy/speed governed by difficulty settings.
 */
export class CPUController {
    private paddle: Paddle;
    private scene: Phaser.Scene;
    private settings: CPUSettings;
    private targetPos: number = 0; // where CPU wants the paddle to be
    private lastUpdateTime: number = 0;
    private errorOffset: number = 0;

    constructor(scene: Phaser.Scene, paddle: Paddle, difficulty: InputType) {
        this.scene = scene;
        this.paddle = paddle;
        const key = difficulty as keyof typeof CPU_DIFFICULTY;
        this.settings = CPU_DIFFICULTY[key] ?? CPU_DIFFICULTY['cpu-medium'];
        this.errorOffset = (Math.random() - 0.5) * 2 * this.settings.errorMargin;
    }

    /**
     * Call each frame. Reads ball position/velocity, computes a target,
     * and returns a -1 to 1 movement value for the paddle.
     */
    update(balls: Ball[]): number {
        const now = this.scene.time.now;

        // Only recalculate target after reaction delay
        if (now - this.lastUpdateTime > this.settings.reactionDelay) {
            this.lastUpdateTime = now;
            this.targetPos = this.computeTarget(balls);
            // Re-randomize error offset periodically
            this.errorOffset = (Math.random() - 0.5) * 2 * this.settings.errorMargin;
        }

        const target = this.targetPos + this.errorOffset;
        const current = this.paddle.orientation === 'vertical' ? this.paddle.y : this.paddle.x;
        const diff = target - current;
        const deadzone = 6;

        if (Math.abs(diff) < deadzone) return 0;

        const raw = Phaser.Math.Clamp(diff / 80, -1, 1);
        return raw * this.settings.speedFactor;
    }

    private computeTarget(balls: Ball[]): number {
        // Find the most threatening ball (closest and heading toward us)
        const ball = this.findThreateningBall(balls);
        if (!ball) {
            // No ball heading toward us — return to center
            return this.paddle.orientation === 'vertical'
                ? GAME_HEIGHT / 2
                : GAME_WIDTH / 2;
        }

        // Predict where ball will intercept our paddle's axis
        return this.predictIntercept(ball);
    }

    private findThreateningBall(balls: Ball[]): Ball | null {
        let best: Ball | null = null;
        let bestDist = Infinity;

        for (const ball of balls) {
            if (!ball.active || !ball.body) continue;
            const vel = ball.body.velocity;

            let isApproaching = false;
            let dist = Infinity;

            if (this.paddle.orientation === 'vertical') {
                // Vertical paddle on left or right
                if (this.paddle.x < GAME_WIDTH / 2) {
                    // Left paddle: ball must be moving left
                    isApproaching = vel.x < -20;
                    dist = ball.x - this.paddle.x;
                } else {
                    // Right paddle: ball must be moving right
                    isApproaching = vel.x > 20;
                    dist = this.paddle.x - ball.x;
                }
            } else {
                // Horizontal paddle on top or bottom
                if (this.paddle.y < GAME_HEIGHT / 2) {
                    isApproaching = vel.y < -20;
                    dist = ball.y - this.paddle.y;
                } else {
                    isApproaching = vel.y > 20;
                    dist = this.paddle.y - ball.y;
                }
            }

            if (isApproaching && dist > 0 && dist < bestDist) {
                bestDist = dist;
                best = ball;
            }
        }
        return best;
    }

    private predictIntercept(ball: Ball): number {
        const vel = ball.body.velocity;
        const noise = (Math.random() - 0.5) * 2 * this.settings.predictionNoise;

        if (this.paddle.orientation === 'vertical') {
            // Time for ball to reach our x
            const dx = this.paddle.x - ball.x;
            if (Math.abs(vel.x) < 10) return ball.y + noise;
            const t = dx / vel.x;
            if (t < 0) return ball.y + noise;

            // Predicted y, accounting for wall bounces
            let predictedY = ball.y + vel.y * t;
            // Simulate bouncing off top/bottom walls
            predictedY = this.bounceClamp(predictedY, 0, GAME_HEIGHT);
            return predictedY + noise;
        } else {
            const dy = this.paddle.y - ball.y;
            if (Math.abs(vel.y) < 10) return ball.x + noise;
            const t = dy / vel.y;
            if (t < 0) return ball.x + noise;

            let predictedX = ball.x + vel.x * t;
            predictedX = this.bounceClamp(predictedX, 0, GAME_WIDTH);
            return predictedX + noise;
        }
    }

    /** Simulate a value bouncing back and forth within bounds */
    private bounceClamp(value: number, min: number, max: number): number {
        const range = max - min;
        if (range <= 0) return min;
        let v = value - min;
        const fullCycles = Math.floor(v / range);
        v = v - fullCycles * range;
        // If odd number of bounces, reverse
        if (fullCycles % 2 === 1) v = range - v;
        return min + v;
    }
}
