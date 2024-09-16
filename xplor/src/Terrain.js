import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';
import { createTerrainDetail } from './TerrainDetails';
import { adjustColor } from './utils';
import { setupInteraction } from './scrolling';
import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE, LOAD_DISTANCE, TERRAIN_SCALE, TEXTURE_SCALE } from './configs';

const SAVANNA_START = -0.65;
const SAVANNA_END = -0.55;
const SAVANNA_THRESHOLD = [SAVANNA_START, SAVANNA_END];

const SNOW_BIOME_START = 0.75;
const SNOW_BIOME_END = 1;
const SNOW_BIOME_THRESHOLD = [SNOW_BIOME_START, SNOW_BIOME_END];

const OCEAN_START = -1;
const OCEAN_END = -0.75;
const OCEAN_THRESHOLD = [OCEAN_START, OCEAN_END];

const BIOME_EDGE = 0.03;


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
      { 0: [-0.5, -0.3] },
      { 0: [0.4, 0.8], 2: OCEAN_THRESHOLD }  //Shallow part of Ocean biome
    ],
    colors: { light: 0x87CEFA, dark: 0x82C7F5 }
  },
  {
    type: 'DEEP LAKE',
    thresholds: [
      { 0: [-Infinity, -0.5] },
      { 0: [-0.9, -0.85], 2: SAVANNA_THRESHOLD }, // Very small, oasis water in savanna
      { 0: [-Infinity, 0.4], 2: OCEAN_THRESHOLD }  //Ocean biome
    ],
    colors: { light: 0x3da8eb, dark: 0x3da8eb}
  },
  {
    type: 'SAND',
    thresholds: [
      { 0: [-0.3, -0.1] },
      { 0: [0.8, 1], 2: [OCEAN_THRESHOLD] },  // Sand islands in ocean biome
      { 0: [-0.1, 1], 1: [-0.5, 0.3], 2: [OCEAN_END, OCEAN_END+BIOME_EDGE] },  // Sand edges to ocean biome
      { 0: [0.7, 1],  2: [OCEAN_END, OCEAN_END+BIOME_EDGE] },  // Sand edges to ocean biome

    ],
    colors: { light: 0xFAEBD7, dark: 0xFAEBD7, secondary: 0xFAEBD7 }
  },
  {
    type: 'GRASS',
    thresholds: [
      { 0: [-0.1, 0.7] },
      { 0: [-0.1, 0.7], 1: [0, 3, 0.7] },
      { 0: [-Infinity, -0.3], 1: [0.6, Infinity] }  // Grass islands in lakes
    ],
    colors: { light: 0x98FB98, dark: 0x7AC97A }
  },
  {
    type: 'FOREST',
    thresholds: [
      { 0: [-0.1, 0.7], 1: [-0.5, 0.3] },
    ],
    colors: { light: 0x8db731, dark: 0x7AC97A }
  },

  {
    type: 'MOUNTAIN',
    thresholds: [
      { 0: [0.4, 0.85] }
    ],
    colors: { light: 0xBEBEBE, dark: 0x989898 }
  },
  {
    type: 'MOUNTAINPEAK',
    thresholds: [
      { 0: [0.85, Infinity] }
    ],
    colors: { light: 0x626262, dark: 0x626262 }
  },
  {
    type: 'SNOW',
    thresholds: [
      { 0: [-0.7, 1], 2: SNOW_BIOME_THRESHOLD }  // Snow biome
    ],
    colors: { light: 0xFFFFFF, dark: 0xFFFFFF }
  },
  {
    type: 'ICE',
    thresholds: [
      { 0: [-1, -0.7], 2: SNOW_BIOME_THRESHOLD },  // Snow biome Ice Lakes
      { 0: [-1, -0.1], 2: [SNOW_BIOME_START-BIOME_EDGE,SNOW_BIOME_START] }  // Snow biome Edge Ice Lakes
    ],
    colors: { light: 0xBDDEEC, dark: 0xD7EBF3 }
  },

  {
    type: 'SNOWY GRASS',
    thresholds: [
      { 0: [-0.2, 1], 2: [SNOW_BIOME_START-BIOME_EDGE, SNOW_BIOME_START] }  // Snow biome edge grass
    ],
    colors: { light: 0x98FB98, dark: 0xFFFFFF, secondary: 0xFFFFFF }
  },
  {
    type: 'SAVANNA',
    thresholds: [
      { 0: [-0.85, 1], 2: SAVANNA_THRESHOLD } // Savanna biome with smaller noise map 2 range than oceans or snow
    ],
    colors: { light: 0xfae984, dark: 0xf2df6b }  // Yellowish dry grass
  },

  // Add the rare OASIS terrain in deep valleys
  {
    type: 'OASIS',
    thresholds: [
      { 0: [-1, -0.9], 2: SAVANNA_THRESHOLD }  // Oasis grass next to water in savanna biome
    ],
    colors: { light: 0x98FB98, dark: 0x7AC97A }  //green for oasis
  },

  
  {
    type: 'SANDY SAVANNA',
    thresholds: [
      { 0: [-0.1, 1], 2: [SAVANNA_START-BIOME_EDGE, SAVANNA_START] },
      { 0: [-0.1, 1], 2: [SAVANNA_END, SAVANNA_END+BIOME_EDGE] },
      { 0: [-0.2, 1], 1: [0.3, 0.8], 2: SAVANNA_THRESHOLD }  // Rare sandy patches in savanna
    ],
    colors: { light: 0xfae984, dark: 0xFAEBD7 }  // Sand mixed with yellowish grass
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
  return 'GRASS'; // Fallback terrain type
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
      const baseColor = getShadedTerrainColor(terrain, (noiseValues[0] + 1) / 2);
      const secondColor = TERRAIN_INFO.find(t => t.type === terrain).colors?.secondary ?? baseColor;

      const tile = createTexturedTile(baseColor, secondColor, tileCache, noiseMaps, app);
      tile.position.set(x * TILE_SIZE, y * TILE_SIZE);
      chunkContainer.addChild(tile);

      createTerrainDetail(terrain, detailCache, x, y, chunkContainer);

    }
  }

  worldContainer.addChild(chunkContainer);
  chunks[chunkKey] = chunkContainer;
}


function getShadedTerrainColor(terrain, noise) {
  noise = Math.round(noise * 20) / 20; // Quantize noise to steps of 0.1
  const { light, dark } = TERRAIN_INFO.find(t => t.type === terrain).colors;

  const r = ((light >> 16) + ((dark >> 16) - (light >> 16)) * noise) / 255;
  const g = (((light >> 8) & 0xFF) + (((dark >> 8) & 0xFF) - ((light >> 8) & 0xFF)) * noise) / 255;
  const b = ((light & 0xFF) + ((dark & 0xFF) - (light & 0xFF)) * noise) / 255;

  const color = new PIXI.Color([r, g, b]);
  return color.toNumber();
}


export function createTexturedTile(baseColor, secondColor, tileCache, noiseMaps, app) {
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
      const adjustedColor = adjustColor(baseColor, secondColor, noise);
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
