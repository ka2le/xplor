import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';
import { createTerrainDetail } from './TerrainDetails';
import { setupInteraction } from './scrolling';
import { createNoise2D } from 'simplex-noise';
import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE, LOAD_DISTANCE, TERRAIN_SCALE, TEXTURE_SCALE } from './configs';

const SAVANNA_START = -0.65;
const SAVANNA_END = -0.55;
const SAVANNA_THRESHOLD = [SAVANNA_START, SAVANNA_END];

const SNOW_BIOME_START = 0.75;
const SNOW_BIOME_END = 1;
const SNOW_BIOME_THRESHOLD = [SNOW_BIOME_START, SNOW_BIOME_END];

const OCEAN_START = -1;
const OCEAN_END = -0.55;
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
    textureType:3,
    thresholds: [
      { 0: [-0.5, -0.3] },
      { 0: [0.4, 0.8], 2: OCEAN_THRESHOLD }  //Shallow part of Ocean biome
    ],
    colors: { light: 0x87CEFA, dark: 0x82C7F5 }
  },
  {
    type: 'DEEP LAKE',
    textureType:3,
    thresholds: [
      { 0: [-Infinity, -0.5] },
      { 0: [-0.9, -0.85], 2: SAVANNA_THRESHOLD }, // Very small, oasis water in savanna
      { 0: [-Infinity, 0.4], 2: OCEAN_THRESHOLD },  //Ocean biome
    ],
    colors: { light: 0x3da8eb, dark: 0x3da8eb }
  },
  {
    type: 'SAND',
    textureType:1,
    thresholds: [
      { 0: [-0.3, -0.1] },
      { 0: [0.8, 1], 2: [OCEAN_THRESHOLD] },  // Sand islands in ocean biome
      { 0: [-0.1, 1], 1: [-0.5, 0.3], 2: [OCEAN_END, OCEAN_END + BIOME_EDGE] },  // Sand edges to ocean biome
      { 0: [0.7, 1], 2: [OCEAN_END, OCEAN_END + BIOME_EDGE] },  // Sand edges to ocean biome

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
    colors: { light: 0x81a82a, dark: 0x7AC97A }
  },

  {
    type: 'MOUNTAIN',
    textureType:2,
    thresholds: [
      { 0: [0.4, 0.85] }
    ],
    colors: { light: 0xBEBEBE, dark: 0x989898 }
  },
  {
    type: 'MOUNTAINPEAK',
    textureType:2,
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
    textureType:4,
    thresholds: [
      { 0: [-1, -0.7], 2: SNOW_BIOME_THRESHOLD },  // Snow biome Ice Lakes
      { 0: [-1, -0.1], 2: [SNOW_BIOME_START - BIOME_EDGE, SNOW_BIOME_START] }  // Snow biome Edge Ice Lakes
    ],
    colors: { light: 0xBDDEEC, dark: 0xD7EBF3 }
  },

  {
    type: 'SNOWY GRASS',
    thresholds: [
      { 0: [-0.2, 1], 2: [SNOW_BIOME_START - BIOME_EDGE, SNOW_BIOME_START] }  // Snow biome edge grass
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
    textureType:1,
    thresholds: [
      { 0: [-0.1, 1], 2: [SAVANNA_START - BIOME_EDGE, SAVANNA_START] },
      { 0: [-0.1, 1], 2: [SAVANNA_END, SAVANNA_END + BIOME_EDGE] },
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
      const { light, dark } = TERRAIN_INFO.find(t => t.type === terrain).colors;

      const baseColor = light ?? 0x000000;
      const secondColor = TERRAIN_INFO.find(t => t.type === terrain).colors?.secondary ?? baseColor;

      const tile = createTexturedTile(terrain,baseColor, secondColor, tileCache, noiseMaps, app);
      tile.position.set(x * TILE_SIZE, y * TILE_SIZE);
      chunkContainer.addChild(tile);

      createTerrainDetail(terrain, detailCache, x, y, chunkContainer);

    }
  }

  worldContainer.addChild(chunkContainer);
  chunks[chunkKey] = chunkContainer;
}



export function createTexturedTile(terrain,baseColor, secondColor, tileCache, noiseMaps, app) {
  const cacheKey = baseColor.toString(16).padStart(6, '0');
  if (tileCache.has(cacheKey)) {
    return new PIXI.Sprite(tileCache.get(cacheKey));
  }
  const textureType = TERRAIN_INFO.find(t => t.type === terrain)?.textureType ?? 0;
  const noiseMap = noiseMaps[textureType];
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

export function generateTextureNoiseMaps(textureNoiseMaps) {
  const simplex = createNoise2D();
  const basicSimplexTexture = new Array(TILE_SIZE * TILE_SIZE);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const noise = simplex(x * 0.1, y * 0.1);
      basicSimplexTexture[y * TILE_SIZE + x] = (noise + 1) / 2;
    }
  }

  const perlin = createNoise2D();
  const fractal = createNoise2D();
  const sandTexture = new Array(TILE_SIZE * TILE_SIZE);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      const baseNoise = perlin(x * 0.24, y * 0.24);
      const detailNoise = fractal(x * 1, y * 1);
      sandTexture[y * TILE_SIZE + x] = (baseNoise * 0.8 + detailNoise * 0.2 + 1) / 2;
    }
  }

 // Generate rock texture using Voronoi
 const voronoi = generateVoronoi(TILE_SIZE, TILE_SIZE, 250); // 20 Voronoi points
 const rockTexture = new Array(TILE_SIZE * TILE_SIZE);
 for (let y = 0; y < TILE_SIZE; y++) {
   for (let x = 0; x < TILE_SIZE; x++) {
     rockTexture[y * TILE_SIZE + x] = voronoi[y * TILE_SIZE + x];
   }
 }

 const waterTexture = generateWaterTexture(TILE_SIZE, TILE_SIZE);
 const iceTexture = generateIceTexture(TILE_SIZE, TILE_SIZE);

  textureNoiseMaps.push(basicSimplexTexture);
  textureNoiseMaps.push(sandTexture);
  textureNoiseMaps.push(rockTexture);
  textureNoiseMaps.push(waterTexture);
  textureNoiseMaps.push(iceTexture);
}

function adjustColor(baseColor, secondColor, noise) {
  let r = (baseColor >> 16) & 0xFF;
  let g = (baseColor >> 8) & 0xFF;
  let b = baseColor & 0xFF;
  if (secondColor == 0x7AC97A) {
    console.log("second color is 7AC97A");
  }
  const factor = 0.95 + noise * 0.1;
  if (noise > 0.5) {
    r = (secondColor >> 16) & 0xFF;
    g = (secondColor >> 8) & 0xFF;
    b = secondColor & 0xFF;
  }

  const newR = Math.min(255, Math.max(0, Math.floor(r * factor)));
  const newG = Math.min(255, Math.max(0, Math.floor(g * factor)));
  const newB = Math.min(255, Math.max(0, Math.floor(b * factor)));

  return (newR << 16) | (newG << 8) | newB;
}


function generateVoronoi(width, height, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: Math.random() * width,
      y: Math.random() * height
    });
  }

  const voronoi = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let closestPointIndex = 0;
      for (let i = 0; i < points.length; i++) {
        const dx = x - points[i].x;
        const dy = y - points[i].y;
        const dist = dx * dx + dy * dy; // Using squared distance for efficiency
        if (dist < minDist) {
          minDist = dist;
          closestPointIndex = i;
        }
      }
      voronoi[y * width + x] = (closestPointIndex / (numPoints - 1))*2-1; // Normalize to 0-1 range
    }
  }
  return voronoi;
}
function generateWaterTexture(width, height) {
  const waterTexture = new Array(width * height);
  const simplex = createNoise2D();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // High-frequency base wave
      let value = Math.sin(y * 3.0) * 0.5; // Faster, small up/down
      value += Math.sin(y * 6.0) * 0.3; // Even higher frequency
      
      // Additional layers for complexity (using varying frequencies and amplitudes)
      value += Math.sin(y * 10.0) * 0.15;
      value += Math.sin(y * 15.0 + x * 0.5) * 0.1; // Adding horizontal influence
      
      // Add horizontal displacement to break symmetry
      value += Math.sin(x * 2.0 + y * 0.2) * 0.05;
      
      // Introduce noise to simulate interference
      const noise1 = simplex(x * 0.1, y * 0.1) * 0.3;
      const noise2 = simplex(x * 0.05 + 100, y * 0.5) * 0.15; // Second noise layer for randomness
      value += noise1 + noise2;

      // Normalize using tanh for smoother contrast
      value = Math.tanh(value * 1.5);

      waterTexture[y * width + x] = value;
    }
  }

  return waterTexture;
}

function generateIceTexture(width, height) {
  const iceTexture = new Array(width * height);
  const simplex = createNoise2D();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Base vertical wave pattern by swapping x and y
      let value = Math.sin(y * 0.1) * 0.3;  // Vertical base wave, reduced intensity

      // Add more stretched vertical waves
      value += Math.sin(y * 0.2) * 0.2;    // Slight variation in wave pattern, no x dependency
      value += Math.sin(y * 0.05) * 0.1;   // Very stretched vertical waves for smear

      // Add vertically stretched random noise
      const noise = simplex(y * 0.01, x * 0.001);  // Stretch the noise heavily in y direction
      value += noise * 0.5;  // Increase the impact of the noise for randomness

      // Normalize to 0-1 range
      value = ((value + 1) * 0.5)*2-1;

      iceTexture[y * width + x] = value;
    }
  }

  return iceTexture;
}
