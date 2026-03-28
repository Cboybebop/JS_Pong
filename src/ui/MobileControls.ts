import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.ts';

/**
 * Creates touch zones on mobile devices for paddle control.
 * Left half of screen = P1, Right half = P2.
 * Top half of each zone = move up, bottom half = move down.
 * For multiplayer, splits into 4 quadrants.
 */
export class MobileControls {
    private scene: Phaser.Scene;
    private touchMovements: Map<number, number> = new Map(); // playerIndex -> movement
    private zones: Phaser.GameObjects.Zone[] = [];
    public isActive: boolean = false;

    constructor(scene: Phaser.Scene, playerCount: number) {
        this.scene = scene;

        // Only show on touch devices
        if (!scene.sys.game.device.input.touch) return;
        this.isActive = true;

        if (playerCount <= 2) {
            this.setup2PlayerZones();
        } else {
            this.setup4PlayerZones();
        }
    }

    private setup2PlayerZones(): void {
        // P1: left half
        this.createTouchZone(0, 0, GAME_WIDTH / 2, GAME_HEIGHT, 0);
        // P2: right half
        this.createTouchZone(GAME_WIDTH / 2, 0, GAME_WIDTH / 2, GAME_HEIGHT, 1);
    }

    private setup4PlayerZones(): void {
        const hw = GAME_WIDTH / 2;
        const hh = GAME_HEIGHT / 2;
        // P1: top-left
        this.createTouchZone(0, 0, hw, hh, 0);
        // P2: top-right
        this.createTouchZone(hw, 0, hw, hh, 1);
        // P3: bottom-left
        this.createTouchZone(0, hh, hw, hh, 2);
        // P4: bottom-right
        this.createTouchZone(hw, hh, hw, hh, 3);
    }

    private createTouchZone(x: number, y: number, w: number, h: number, playerIndex: number): void {
        const zone = this.scene.add.zone(x + w / 2, y + h / 2, w, h)
            .setInteractive()
            .setDepth(200);

        zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.updateMovement(pointer, zone, playerIndex);
        });
        zone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) {
                this.updateMovement(pointer, zone, playerIndex);
            }
        });
        zone.on('pointerup', () => {
            this.touchMovements.set(playerIndex, 0);
        });
        zone.on('pointerout', () => {
            this.touchMovements.set(playerIndex, 0);
        });

        this.zones.push(zone);
        this.touchMovements.set(playerIndex, 0);
    }

    private updateMovement(pointer: Phaser.Input.Pointer, zone: Phaser.GameObjects.Zone, playerIndex: number): void {
        // Calculate position relative to zone center
        const relativeY = (pointer.y - zone.y) / (zone.height / 2);
        this.touchMovements.set(playerIndex, Phaser.Math.Clamp(relativeY, -1, 1));
    }

    /** Get touch movement for a player. Returns 0 if no touch active. */
    getMovement(playerIndex: number): number {
        return this.touchMovements.get(playerIndex) ?? 0;
    }

    destroy(): void {
        for (const zone of this.zones) zone.destroy();
        this.zones = [];
        this.touchMovements.clear();
    }
}
