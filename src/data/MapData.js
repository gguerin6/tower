import { TILE_SIZE, GRID_COLS, GRID_ROWS } from '../utils/Constants.js';
import { randomInt, randomChoice } from '../utils/MathUtils.js';

// Helper: convert tile coords to pixel center
const P = (col, row) => ({ x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 });
const PE = (col, row) => ({ x: col * TILE_SIZE, y: row * TILE_SIZE + TILE_SIZE / 2 }); // edge entry (x=0)

export const MapData = {
    forest: {
        name: 'Forest Path',
        description: 'A winding path through the woods',
        difficulty: 1,
        waves: 20,
        startEssence: 120,
        lives: 20,
        entry: { col: 0, row: 3 },
        exit: { col: 26, row: 10 },
        path: [
            PE(0, 3),      // enter left, row 3
            P(7, 3),       // go right
            P(7, 10),      // down to middle
            P(2, 10),      // back left
            P(2, 16),      // down to bottom
            P(14, 16),     // long stretch right
            P(14, 6),      // up to top area
            P(21, 6),      // right
            P(21, 16),     // down to bottom
            P(26, 16),     // right
            P(26, 10)      // up to castle
        ],
        towerSlots: [
            { col: 5, row: 6 },    // left of first drop, clear grass
            { col: 5, row: 13 },   // inside left pocket
            { col: 10, row: 7 },   // center top area
            { col: 10, row: 13 },  // center bottom area
            { col: 16, row: 9 },   // between the two loops
            { col: 16, row: 14 },  // lower center
            { col: 19, row: 9 },   // right loop area
            { col: 19, row: 14 },  // right loop lower
            { col: 23, row: 9 },   // near castle
            { col: 24, row: 13 }   // castle approach
        ],
        bgColor: '#4a7a3a',
        pathColor: '#8a8580'
    },
    desert: {
        name: 'Desert Spiral',
        description: 'A scorching spiral into the heart of the canyon',
        difficulty: 2,
        waves: 24,
        startEssence: 170,
        lives: 18,
        requiredMap: 'forest',
        entry: { col: 0, row: 3 },
        exit: { col: 14, row: 10 },
        path: [
            PE(0, 3),       // enter top-left
            P(27, 3),       // right along top edge
            P(27, 17),      // down right side
            P(2, 17),       // left along bottom edge
            P(2, 7),        // up left side (inner ring)
            P(23, 7),       // right along inner top
            P(23, 14),      // down inner right side
            P(6, 14),       // left along inner bottom
            P(6, 10),       // up to center row
            P(14, 10)       // right to center (castle)
        ],
        towerSlots: [
            // Between outer top (row 3) and inner top (row 7)
            { col: 5,  row: 5 },
            { col: 10, row: 5 },
            { col: 15, row: 5 },
            { col: 20, row: 5 },
            { col: 25, row: 5 },
            // Between left verticals (col 2 ↔ col 6)
            { col: 4, row: 10 },
            { col: 4, row: 13 },
            // Between right verticals (col 27 ↔ col 23)
            { col: 25, row: 10 },
            { col: 25, row: 13 },
            // Inner area (between spiral arms around castle)
            { col: 9,  row: 12 },
            { col: 20, row: 9 },
            { col: 20, row: 12 }
        ],
        bgColor: '#c8a848',
        pathColor: '#8a8580'
    },
    mountain: {
        name: 'Mountain Pass',
        description: 'Treacherous mountain paths',
        difficulty: 3,
        waves: 28,
        startEssence: 190,
        lives: 15,
        requiredMap: 'desert',
        entry: { col: 0, row: 17 },
        exit: { col: 26, row: 10 },
        path: [
            PE(0, 17),     // enter bottom-left
            P(22, 17),     // right across bottom
            P(22, 11),     // climb up
            P(4, 11),      // left across middle
            P(4, 4),       // climb up
            P(26, 4),      // right across top
            P(26, 10)      // descend to castle
        ],
        towerSlots: [
            { col: 6, row: 14 },  { col: 12, row: 14 },
            { col: 18, row: 14 }, { col: 20, row: 14 },
            { col: 7, row: 8 },   { col: 13, row: 8 },
            { col: 18, row: 8 },  { col: 8, row: 2 },
            { col: 14, row: 2 },  { col: 20, row: 2 },
            { col: 2, row: 8 },   { col: 2, row: 14 },
            { col: 24, row: 7 },  { col: 24, row: 14 }
        ],
        bgColor: '#5a6a5a',
        pathColor: '#8a8580'
    },
    swamp: {
        name: 'Murky Swamp',
        description: 'A dangerous swamp with poison mist',
        difficulty: 4,
        waves: 32,
        startEssence: 210,
        lives: 12,
        requiredMap: 'mountain',
        entry: { col: 0, row: 5 },
        exit: { col: 26, row: 10 },
        paths: [
            // Path A — enters top-left
            [
                PE(0, 5),      // spawn A
                P(4, 5),       // right
                P(4, 2),       // up
                P(14, 2),      // right across top
                P(14, 9),      // down to merge zone
                P(18, 9),      // right (merged)
                P(18, 16),     // down to bottom
                P(26, 16),     // right
                P(26, 10)      // up to castle
            ],
            // Path B — enters slightly below, diverges then merges
            [
                PE(0, 9),      // spawn B (close to A)
                P(4, 9),       // right
                P(4, 16),      // down to bottom
                P(14, 16),     // right across bottom
                P(14, 9),      // up to merge zone
                P(18, 9),      // right (merged)
                P(18, 16),     // down to bottom
                P(26, 16),     // right
                P(26, 10)      // up to castle
            ]
        ],
        path: [
            PE(0, 5), P(4, 5), P(4, 2), P(14, 2), P(14, 9),
            P(18, 9), P(18, 16), P(26, 16), P(26, 10)
        ],
        towerSlots: [
            { col: 2, row: 2 },   { col: 2, row: 12 },
            { col: 6, row: 7 },   { col: 7, row: 4 },
            { col: 7, row: 14 },  { col: 10, row: 4 },
            { col: 10, row: 12 }, { col: 12, row: 7 },
            { col: 16, row: 4 },  { col: 16, row: 12 },
            { col: 16, row: 16 }, { col: 20, row: 7 },
            { col: 20, row: 13 }, { col: 24, row: 7 },
            { col: 24, row: 13 }, { col: 22, row: 16 }
        ],
        bgColor: '#3a5a3a',
        pathColor: '#8a8580'
    },
    castle: {
        name: 'Dark Castle',
        description: 'The final stronghold of evil',
        difficulty: 5,
        waves: 36,
        startEssence: 230,
        lives: 10,
        requiredMap: 'swamp',
        entry: { col: 0, row: 3 },
        exit: { col: 26, row: 10 },
        paths: [
            // Path A — top lane
            [
                PE(0, 3),      // spawn A (top)
                P(8, 3),       // right
                P(8, 6),       // down
                P(20, 6),      // right
                P(20, 3),      // up
                P(26, 3),      // right
                P(26, 10)      // down to castle
            ],
            // Path B — middle lane
            [
                PE(0, 10),     // spawn B (mid)
                P(6, 10),      // right
                P(6, 8),       // up
                P(14, 8),      // right
                P(14, 12),     // down
                P(22, 12),     // right
                P(22, 10),     // up
                P(26, 10)      // right to castle
            ],
            // Path C — bottom lane
            [
                PE(0, 17),     // spawn C (bot)
                P(8, 17),      // right
                P(8, 14),      // up
                P(20, 14),     // right
                P(20, 17),     // down
                P(26, 17),     // right
                P(26, 10)      // up to castle
            ]
        ],
        path: [
            PE(0, 3), P(8, 3), P(8, 6), P(20, 6),
            P(20, 3), P(26, 3), P(26, 10)
        ],
        towerSlots: [
            // Top lane (below top path)
            { col: 4, row: 5 },   { col: 12, row: 4 },
            { col: 17, row: 4 },  { col: 23, row: 5 },
            // Mid lane
            { col: 2, row: 8 },   { col: 10, row: 10 },
            { col: 16, row: 10 }, { col: 18, row: 10 },
            { col: 19, row: 9 },  { col: 24, row: 8 },
            // Bot lane
            { col: 4, row: 15 },  { col: 12, row: 16 },
            { col: 17, row: 16 }, { col: 23, row: 15 },
            // Between lanes
            { col: 3, row: 7 },   { col: 5, row: 13 },
            // Castle approach
            { col: 28, row: 7 },  { col: 28, row: 13 }
        ],
        bgColor: '#3a3a4a',
        pathColor: '#8a8580'
    }
};

// Infinite mode map — fixed handcrafted path
export function generateInfiniteMap() {
    return {
        name: 'Infinite Mode',
        description: 'Endless waves of enemies',
        difficulty: 0,
        waves: Infinity,
        startEssence: 150,
        lives: 15,
        entry: { col: 0, row: 4 },
        exit: { col: 26, row: 10 },
        entry: { col: 0, row: 10 },
        path: [
            PE(0, 10),      // enter middle-left
            P(5, 10),       // right
            P(5, 4),        // up to top
            P(13, 4),       // long right along top
            P(13, 17),      // all the way down
            P(7, 17),       // back left along bottom
            P(7, 12),       // up a bit
            P(18, 12),      // long right through center
            P(18, 5),       // up
            P(22, 5),       // right near top
            P(22, 17),      // down to bottom
            P(26, 17),      // right
            P(26, 10)       // up to castle
        ],
        towerSlots: [
            { col: 3, row: 7 },    { col: 3, row: 13 },
            { col: 8, row: 2 },    { col: 11, row: 2 },
            { col: 10, row: 7 },   { col: 10, row: 10 },
            { col: 15, row: 10 },  { col: 15, row: 15 },
            { col: 10, row: 15 },  { col: 5, row: 15 },
            { col: 15, row: 3 },   { col: 20, row: 3 },
            { col: 20, row: 9 },   { col: 20, row: 14 },
            { col: 20, row: 8 },   { col: 24, row: 14 }
        ],
        bgColor: '#4a6a3f',
        pathColor: '#b49a5c',
        infinite: true
    };
}
