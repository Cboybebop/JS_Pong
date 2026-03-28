// Game dimensions
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Paddle
export const PADDLE_WIDTH = 16;
export const PADDLE_HEIGHT = 120;
export const PADDLE_SPEED = 500;
export const PADDLE_MARGIN = 40; // distance from edge

// Ball
export const BALL_SIZE = 14;
export const BALL_SPEED_INITIAL = 400;
export const BALL_SPEED_INCREMENT = 15; // per hit
export const BALL_SPEED_MAX = 900;

// Scoring
export const SCORE_TO_WIN = 11;

// Power-ups (Modern/Multiplayer)
export const POWERUP_SPAWN_INTERVAL = 8000; // ms between spawns
export const POWERUP_SIZE = 28;
export const POWERUP_DURATION = {
    SLOW_OPPONENT: 8000,
    SPEED_BOOST: 8000,
    BIG_PADDLE: 10000,
    SHRINK_OPPONENT: 10000,
    MULTIBALL: 6000,
    FIREBALL: 0,   // single use
    SHIELD: 10000,
};

// Colors
export const COLORS = {
    // Retro (Standard mode)
    RETRO_BG: 0x000000,
    RETRO_FG: 0x33ff33,
    RETRO_DIM: 0x115511,

    // Modern (Modern/Multiplayer mode)
    MODERN_BG: 0x0d1025,
    NEON_CYAN: 0x00ffff,
    NEON_MAGENTA: 0xff00ff,
    NEON_YELLOW: 0xffff00,
    NEON_GREEN: 0x00ff88,
    NEON_ORANGE: 0xff8800,
    NEON_RED: 0xff2244,
    NEON_WHITE: 0xffffff,

    // Player colors (Multiplayer)
    PLAYER_COLORS: [0x00ffff, 0xff00ff, 0x00ff88, 0xff8800],
};

// Game modes
export type GameMode = 'standard' | 'modern' | 'multiplayer';

// Input types for player configuration
export type InputType = 'keyboard' | 'gamepad' | 'cpu-easy' | 'cpu-medium' | 'cpu-hard';

export interface PlayerConfig {
    inputType: InputType;
    label: string; // display name e.g. "P1", "CPU (Hard)"
}

// CPU difficulty settings
export const CPU_DIFFICULTY = {
    'cpu-easy': {
        reactionDelay: 300,   // ms before reacting to ball change
        errorMargin: 60,      // px offset from ideal position
        speedFactor: 0.55,    // fraction of paddle speed used
        predictionNoise: 80,  // px noise on ball prediction
    },
    'cpu-medium': {
        reactionDelay: 140,
        errorMargin: 25,
        speedFactor: 0.78,
        predictionNoise: 35,
    },
    'cpu-hard': {
        reactionDelay: 50,
        errorMargin: 8,
        speedFactor: 0.95,
        predictionNoise: 10,
    },
};

// Scenes
export const SCENES = {
    BOOT: 'BootScene',
    MENU: 'MenuScene',
    LOBBY: 'LobbyScene',
    GAME: 'GameScene',
    PAUSE: 'PauseScene',
    GAME_OVER: 'GameOverScene',
};
