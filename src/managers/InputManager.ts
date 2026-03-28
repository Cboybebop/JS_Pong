import Phaser from 'phaser';
import { MobileControls } from '../ui/MobileControls.ts';

export interface PlayerInput {
    /** Movement value from -1 (up/left) to 1 (down/right) */
    movement: number;
}

interface KeyBinding {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
}

/**
 * Unified input manager that normalizes keyboard, gamepad, and touch
 * into a simple -1 to 1 movement value per player slot.
 */
export class InputManager {
    private scene: Phaser.Scene;
    private keyBindings: (KeyBinding | null)[] = [];
    private playerCount: number;
    private mobileControls: MobileControls;

    constructor(scene: Phaser.Scene, playerCount: number) {
        this.scene = scene;
        this.playerCount = playerCount;
        this.setupKeyboard();
        this.mobileControls = new MobileControls(scene, playerCount);
    }

    private setupKeyboard(): void {
        const kb = this.scene.input.keyboard;
        if (!kb) return;

        // P1: W/S
        this.keyBindings[0] = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        };

        // P2: Arrow Up/Down
        this.keyBindings[1] = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        };

        // P3: I/K (for 4-player)
        if (this.playerCount > 2) {
            this.keyBindings[2] = {
                up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.I),
                down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            };
        }

        // P4: Numpad 8/5
        if (this.playerCount > 3) {
            this.keyBindings[3] = {
                up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_EIGHT),
                down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_FIVE),
            };
        }
    }

    /** Get normalized input for a given player index */
    getInput(playerIndex: number): PlayerInput {
        let movement = 0;

        // 1. Keyboard
        const keys = this.keyBindings[playerIndex];
        if (keys) {
            if (keys.up.isDown) movement -= 1;
            if (keys.down.isDown) movement += 1;
        }

        // 2. Gamepad (if connected for this player slot)
        if (movement === 0) {
            const pad = this.scene.input.gamepad?.getPad(playerIndex);
            if (pad) {
                // Left stick Y axis
                const stickY = pad.leftStick.y;
                if (Math.abs(stickY) > 0.15) { // deadzone
                    movement = stickY;
                }
                // D-pad fallback
                if (movement === 0) {
                    if (pad.up) movement -= 1;
                    if (pad.down) movement += 1;
                }
            }
        }

        // 3. Touch (mobile)
        if (movement === 0 && this.mobileControls.isActive) {
            movement = this.mobileControls.getMovement(playerIndex);
        }

        return { movement: Phaser.Math.Clamp(movement, -1, 1) };
    }

    destroy(): void {
        this.keyBindings = [];
        this.mobileControls.destroy();
    }
}
