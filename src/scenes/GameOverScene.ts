import Phaser from 'phaser';
import { SCENES, GAME_WIDTH, GAME_HEIGHT } from '../constants.ts';
import { submitScore, getLeaderboard, isSupabaseConfigured, ScoreEntry } from '../services/supabase.ts';

interface GameOverData {
    winnerIndex: number;
    scores: number[];
    mode: string;
    duration: number;
}

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super(SCENES.GAME_OVER);
    }

    create(data: GameOverData): void {
        const cx = GAME_WIDTH / 2;

        // Dim overlay
        this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

        // Winner text
        const winnerLabel = data.winnerIndex >= 0
            ? `PLAYER ${data.winnerIndex + 1} WINS!`
            : 'GAME OVER';

        this.add.text(cx, 180, winnerLabel, {
            fontFamily: 'monospace',
            fontSize: '48px',
            color: '#00ffff',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Score summary
        const scoreStr = data.scores.map((s, i) => `P${i + 1}: ${s}`).join('   ');
        this.add.text(cx, 260, scoreStr, {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#ffffff',
        }).setOrigin(0.5);

        // Duration
        const mins = Math.floor(data.duration / 60);
        const secs = data.duration % 60;
        this.add.text(cx, 310, `Time: ${mins}:${secs.toString().padStart(2, '0')}`, {
            fontFamily: 'monospace',
            fontSize: '18px',
            color: '#888888',
        }).setOrigin(0.5);

        // Play again button
        const btnBg = this.add.rectangle(cx, 420, 280, 50, 0x111122, 0.9)
            .setStrokeStyle(2, 0x00ffff)
            .setInteractive({ useHandCursor: true });

        this.add.text(cx, 420, 'PLAY AGAIN', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#00ffff',
        }).setOrigin(0.5);

        btnBg.on('pointerdown', () => {
            this.scene.start(SCENES.GAME, { mode: data.mode, playerCount: data.scores.length });
        });

        // Menu button
        const menuBg = this.add.rectangle(cx, 500, 280, 50, 0x111122, 0.9)
            .setStrokeStyle(2, 0x888888)
            .setInteractive({ useHandCursor: true });

        this.add.text(cx, 500, 'MAIN MENU', {
            fontFamily: 'monospace',
            fontSize: '24px',
            color: '#888888',
        }).setOrigin(0.5);

        menuBg.on('pointerdown', () => {
            this.scene.start(SCENES.MENU);
        });

        // Keyboard shortcut
        this.input.keyboard?.once('keydown-SPACE', () => {
            this.scene.start(SCENES.GAME, { mode: data.mode, playerCount: data.scores.length });
        });
        this.input.keyboard?.once('keydown-ESC', () => {
            this.scene.start(SCENES.MENU);
        });

        // Leaderboard section
        if (isSupabaseConfigured()) {
            this.createLeaderboardUI(data);
        }
    }

    private createLeaderboardUI(data: GameOverData): void {
        const cx = GAME_WIDTH / 2;
        const winnerScore = data.winnerIndex >= 0 ? data.scores[data.winnerIndex] : 0;

        // Name input prompt (DOM element)
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Enter name...';
        nameInput.maxLength = 12;
        nameInput.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, 200px);
            background: #111; color: #0ff; border: 1px solid #0ff; padding: 8px 16px;
            font-family: monospace; font-size: 16px; text-align: center;
            outline: none; width: 180px; z-index: 10;
        `;
        document.body.appendChild(nameInput);
        nameInput.focus();

        // Submit button
        const submitBtn = this.add.text(cx + 120, 570, '[SUBMIT]', {
            fontFamily: 'monospace',
            fontSize: '16px',
            color: '#00ffff',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        let submitted = false;
        const doSubmit = async () => {
            if (submitted) return;
            const name = nameInput.value.trim() || 'ANON';
            submitted = true;
            submitBtn.setText('...');
            nameInput.remove();

            await submitScore(name, winnerScore, data.mode, data.duration);
            submitBtn.setText('SAVED!');
            this.loadLeaderboard(data.mode);
        };

        submitBtn.on('pointerdown', doSubmit);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSubmit();
        });

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            nameInput.remove();
        });

        // Load existing leaderboard
        this.loadLeaderboard(data.mode);
    }

    private async loadLeaderboard(mode: string): Promise<void> {
        const cx = GAME_WIDTH / 2;
        const entries = await getLeaderboard(mode, 10);

        // Clear old leaderboard text
        this.children.list
            .filter((c): c is Phaser.GameObjects.Text =>
                c instanceof Phaser.GameObjects.Text && c.getData('isLB') === true
            )
            .forEach(c => c.destroy());

        if (entries.length === 0) return;

        const header = this.add.text(cx, 610, '── LEADERBOARD ──', {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);
        header.setData('isLB', true);

        entries.forEach((entry: ScoreEntry, i: number) => {
            const color = i < 3 ? '#ffff00' : '#aaaaaa';
            const t = this.add.text(cx, 635 + i * 20,
                `#${i + 1} ${entry.player_name.padEnd(12)} ${String(entry.score).padStart(4)}`, {
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color,
                }).setOrigin(0.5);
            t.setData('isLB', true);
        });
    }
}
