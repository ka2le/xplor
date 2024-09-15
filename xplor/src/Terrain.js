import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';
import { createTerrainDetail } from './TerrainDetails';
import { adjustColor } from './utils';
import { setupInteraction } from './scrolling';
import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE, LOAD_DISTANCE, TERRAIN_SCALE, TEXTURE_SCALE } from './configs';



const noise_maps_info = [
    { scale: TERRAIN_SCALE, offsetX: 0, offsetY: 0 }, //Main terrain noise
    { scale: TERRAIN_SCALE, offsetX: 300, offsetY: 200 }, //Variation in terrain noise
    { scale: 0.004, offsetX: 200, offsetY: 300 } // Biome noise
  ];

// Terrain definitions
export const TERRAIN_INFO = [
  { 
    type: 'LAKE', 
    thresholds: [
      { 0: [-Infinity, -0.3] },
      { 0: [-Infinity, 0], 2: [-1, -0.8] }  //Lake biome
    ],
    colors: { light: 0x87CEFA, dark: 0x82C7F5 }
  },
  { 
    type: 'SAND', 
    thresholds: [
      { 0: [-0.3, -0.1] },
        { 0: [0, 0.1], 2: [-1, -0.8] }  // Sand islands in lakes

    ],
    colors: { light: 0xFAEBD7, dark: 0xF5E3C9 }
  },
  { 
    type: 'GRASS', 
    thresholds: [
      { 0: [-0.1, 0.3] },
      { 0: [-Infinity, -0.3], 1: [0.6, Infinity] }  // Grass islands in lakes
    ],
    colors: { light: 0x98FB98, dark: 0x8FF48F }
  },
  { 
    type: 'FOREST', 
    thresholds: [
      { 0: [0.3, 0.7] }
    ],
    colors: { light: 0x2E8B57, dark: 0x2A8251 }
  },
  { 
    type: 'MOUNTAIN', 
    thresholds: [
      { 0: [0.4, Infinity] }
    ],
    colors: { light: 0xBEBEBE, dark: 0xB4B4B4 }
  },
  {
    type: 'SNOW',
    thresholds: [
      { 2: [0.7, Infinity] }  // Snow biome, overrides everything
    ],
    colors: { light: 0xFFFFFF, dark: 0xF0F0F0 }
  }
];


// Preprocess TERRAIN_INFO for efficient lookup
function preprocessTerrainInfo(terrainInfo, noiseMapsInfo) {
    const processed = new Array(noiseMapsInfo.length).fill().map(() => []);
  
    terrainInfo.forEach((terrain, index) => {
      terrain.thresholds.forEach(rule => {
        const highestNoiseMap = Math.max(...Object.keys(rule).map(Number));
        const conditionCount = Object.keys(rule).length;
        
        processed[highestNoiseMap].push({
          type: terrain.type,
          rule,
          conditionCount,
          originalIndex: index
        });
      });
    });
  
    // Sort each noise map's rules
    processed.forEach(noiseMapRules => {
      noiseMapRules.sort((a, b) => {
        if (a.conditionCount !== b.conditionCount) {
          return b.conditionCount - a.conditionCount; // More conditions first
        }
        return a.originalIndex - b.originalIndex; // Earlier in TERRAIN_INFO first
      });
    });
  
    return processed;
  }
  

const processedTerrainInfo = preprocessTerrainInfo(TERRAIN_INFO, noise_maps_info);

function determineTerrainType(noiseValues) {
    for (let noiseMap = noise_maps_info.length - 1; noiseMap >= 0; noiseMap--) {
      for (const { type, rule } of processedTerrainInfo[noiseMap]) {
        if (Object.entries(rule).every(([noiseIndex, [min, max]]) => 
          noiseValues[noiseIndex] >= min && noiseValues[noiseIndex] <= max
        )) {
          return type;
        }
      }
    }
    return 'DEFAULT'; // Fallback terrain type
  }

  // Generate noise values using the noise_maps_info settings
function getNoiseValues(x, y, simplex) {
    return noise_maps_info.map(info => 
      simplex((x * info.scale) + info.offsetX, (y * info.scale) + info.offsetY)
    );
  }


export function generateChunk(chunkX, chunkY, tileCache, noiseMaps, app, chunks, simplex, worldContainer, detailCache) {
    const chunkKey = `${chunkX},${chunkY}`;
    if (chunks[chunkKey]) return;
  
    const chunkContainer = new PIXI.Container();
    chunkContainer.position.set(chunkX * CHUNK_SIZE * TILE_SIZE, chunkY * CHUNK_SIZE * TILE_SIZE);
  
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldY = chunkY * CHUNK_SIZE + y;
  
        const noiseValues = getNoiseValues(worldX, worldY, simplex);
        const terrain = determineTerrainType(noiseValues);
        const baseColor = getTerrainColor(terrain, (noiseValues[0] + 1) / 2);
  
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


  
function getTerrainColor(terrain, noise) {
    const { light, dark } = TERRAIN_INFO.find(t => t.type === terrain).colors;
    return PIXI.utils.rgb2hex([
      ((light >> 16) + ((dark >> 16) - (light >> 16)) * noise) / 255,
      (((light >> 8) & 0xFF) + (((dark >> 8) & 0xFF) - ((light >> 8) & 0xFF)) * noise) / 255,
      ((light & 0xFF) + ((dark & 0xFF) - (light & 0xFF)) * noise) / 255
    ]);
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
            const waveX = Math.sin(y / 7.4) * 2.74;
            const waveY = Math.cos(x / 7.4) * 2.7;

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
