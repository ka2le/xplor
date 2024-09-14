import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';
import { createTerrainDetail } from './TerrainDetails';
import { adjustColor } from './utils';
import { setupInteraction } from './scrolling';
import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE, LOAD_DISTANCE, TERRAIN_SCALE, TEXTURE_SCALE } from './configs';

const OFFSET_X = 300; // Offset for the second noise map
const OFFSET_Y = 200; // Offset for the second noise map

export const TERRAIN_INFO = [
    {
        type: 'LAKE',
        threshold: -0.5,
        colors: { light: 0x87CEFA, dark: 0x82C7F5 }  // Dark version is very close to light
    },
    {
        type: 'SAND',
        threshold: -0.2,
        colors: { light: 0xFAEBD7, dark: 0xF5E3C9 }  // Dark version is very close to light
    },
    {
        type: 'GRASS',
        threshold: 0.2,
        colors: { light: 0x98FB98, dark: 0x8FF48F }  // Dark version is very close to light
    },
    {
        type: 'FOREST',
        threshold: 0.5,
        colors: { light: 0x2E8B57, dark: 0x2A8251 }  // Dark version is very close to light
    },
    {
        type: 'MOUNTAIN',
        threshold: Infinity,
        colors: { light: 0xBEBEBE, dark: 0xB4B4B4 }  // Dark version is very close to light
    }
];

function determineTerrainType(primaryNoise, secondaryNoise) {
    let primaryType = getTerrainType(primaryNoise);
    let secondaryType = getTerrainType(secondaryNoise);

    // Adjust terrain types based on secondary noise influence
    if (primaryType === 'SAND' && secondaryType === 'MOUNTAIN') {
        return 'MOUNTAIN'; // Sand near high secondary noise becomes mountains
    } else if (primaryType === 'LAKE' && secondaryType === 'FOREST') {
        return 'GRASS'; // Lakes with high secondary noise grow grass islands
    } else if ((primaryType === 'FOREST' && secondaryType === 'GRASS') || (primaryType === 'GRASS' && secondaryType === 'FOREST')) {
        return secondaryType; // Swap forest and grass based on secondary noise
    }
    return primaryType; // Default to primary type if no special conditions are met
}

export function getTerrainType(noise) {
    return TERRAIN_INFO.find(terrain => noise < terrain.threshold).type;
}

export function getTerrainColor(terrain, noise) {
    const terrainData = TERRAIN_INFO.find(t => t.type === terrain);
    const { light, dark } = terrainData.colors;
    return PIXI.utils.rgb2hex([
        ((light >> 16) + ((dark >> 16) - (light >> 16)) * noise) / 255,
        (((light >> 8) & 0xFF) + (((dark >> 8) & 0xFF) - ((light >> 8) & 0xFF)) * noise) / 255,
        ((light & 0xFF) + ((dark & 0xFF) - (light & 0xFF)) * noise) / 255
    ]);
}

// Updated generateChunk function to use determineTerrainType
export function generateChunk(chunkX, chunkY, tileCache, noiseMaps, app, chunks, simplex, worldContainer, detailCache) {
    const chunkKey = `${chunkX},${chunkY}`;
    if (chunks[chunkKey]) return;

    const chunkContainer = new PIXI.Container();
    chunkContainer.position.set(chunkX * CHUNK_SIZE * TILE_SIZE, chunkY * CHUNK_SIZE * TILE_SIZE);

    for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldY = chunkY * CHUNK_SIZE + y;

            const primaryNoise = simplex(worldX * TERRAIN_SCALE, worldY * TERRAIN_SCALE);
            const secondaryNoise = simplex((worldX * TERRAIN_SCALE) + OFFSET_X, (worldY * TERRAIN_SCALE) + OFFSET_Y);

            const terrain = determineTerrainType(primaryNoise, secondaryNoise);
            const baseColor = getTerrainColor(terrain, (primaryNoise + 1) / 2);

            const tile = createTexturedTile(baseColor, tileCache, noiseMaps, app);
            tile.position.set(x * TILE_SIZE, y * TILE_SIZE);

            chunkContainer.addChild(tile);

            if (Math.random() < DETAIL_CHANCE) {
                const detail = createTerrainDetail(terrain, detailCache);
                if (detail) {
                    detail.position.set(x * TILE_SIZE, y * TILE_SIZE);
                    chunkContainer.addChild(detail);
                }
            }
        }
    }

    worldContainer.addChild(chunkContainer);
    chunks[chunkKey] = chunkContainer;
}


export function createTexturedTile(baseColor, tileCache, noiseMaps, app) {
    const cacheKey = baseColor.toString(16).padStart(6, '0');
    if (tileCache.has(cacheKey)) {
        return new PIXI.Sprite(tileCache.get(cacheKey));
    }

    const noiseMap = noiseMaps[Math.floor(Math.random() * NUM_NOISE_MAPS)];
    const graphics = new PIXI.Graphics();
    // Fill background with base color
    graphics.beginFill(baseColor);
    graphics.drawRect(0, 0, TILE_SIZE, TILE_SIZE);
    graphics.endFill();
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const noise = noiseMap[y * TILE_SIZE + x];
            const adjustedColor = adjustColor(baseColor, noise);
            const waveX = Math.sin(y / 5) * 1.5;
            const waveY = Math.cos(x / 5) * 3;

            graphics.beginFill(adjustedColor, 1);
            graphics.drawRect(Math.round(x + waveX), Math.round(y + waveY), 1, 1);
            graphics.endFill();
        }
    }

    const texture = app.renderer.generateTexture(graphics, {
        scaleMode: PIXI.SCALE_MODES.NEAREST,
        resolution: 1
    });
    tileCache.set(cacheKey, texture);

    return new PIXI.Sprite(texture);
}
