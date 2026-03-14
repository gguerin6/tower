export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 640;
export const TILE_SIZE = 32;
export const GRID_COLS = CANVAS_WIDTH / TILE_SIZE;  // 30
export const GRID_ROWS = CANVAS_HEIGHT / TILE_SIZE; // 20

export const LAYERS = {
    BG: 'bg-canvas',
    ENTITY: 'entity-canvas',
    UI: 'ui-canvas'
};

export const SCENES = {
    MAIN_MENU: 'mainMenu',
    VILLAGE: 'village',
    MAP_SELECT: 'mapSelect',
    GAME: 'game',
    PAUSE: 'pause',
    GAME_OVER: 'gameOver',
    CINEMATIC: 'cinematic'
};

export const TOWER_TYPES = {
    ARCHER: 'archer',
    MAGE: 'mage',
    CANNON: 'cannon',
    FROST: 'frost',
    TESLA: 'tesla'
};

export const ENEMY_TYPES = {
    GOBLIN: 'goblin',
    WOLF: 'wolf',
    ORC: 'orc',
    BAT: 'bat',
    SHAMAN: 'shaman'
};

export const COLORS = {
    GRASS: '#4a7c3f',
    PATH: '#c4a46c',
    WATER: '#3b7dd8',
    STONE: '#888888',
    DARK_GRASS: '#3d6b34',
    VILLAGE_GROUND: '#d4a86a',
    UI_BG: 'rgba(0,0,0,0.8)',
    UI_BORDER: '#888',
    UI_TEXT: '#fff',
    UI_GOLD: '#ffd700',
    UI_RED: '#e74c3c',
    UI_GREEN: '#2ecc71',
    UI_BLUE: '#3498db',
    HEALTH_BG: '#333',
    HEALTH_GREEN: '#2ecc71',
    HEALTH_RED: '#e74c3c',
    HEALTH_YELLOW: '#f1c40f'
};
