import * as PIXI from 'pixi.js';
import { DETAIL_CHANCE, TILE_SIZE } from './configs';

const DEFAULT_TERRAIN_SCALE = 3;
// Pixel art terrain details
const url = window.location.origin + "/xplor";
const terrainDetails = {
  stone: { type: 'image', content: `${url}/images/stone.png`, scale: 0.22 },
  flower1: { type: 'image', content: `${url}/images/flower1.png`, scale: 0.14 },
  flower2: { type: 'image', content: `${url}/images/flower2.png`, scale: 0.11 },
  flower3: { type: 'image', content: `${url}/images/flower3.png`, scale: 0.11 },
  flower4: { type: 'image', content: `${url}/images/flower4.png`, scale: 0.11 },
  flower5: { type: 'image', content: `${url}/images/flower5.png`, scale: 0.11 },
  flower6: { type: 'image', content: `${url}/images/flower6.png`, scale: 0.11 },
  stick: { type: 'image', content: `${url}/images/stick.png`, scale: 0.14 },
  lilyPad: { type: 'image', content: `${url}/images/lilypad.png`, scale: 0.16 },
  tree1: { type: 'image', content: `${url}/images/tree1.png`, scale: 0.29 },
  tree2: { type: 'image', content: `${url}/images/tree2.png`, scale: 0.29 },
  tree3: { type: 'image', content: `${url}/images/tree3.png`, scale: 0.31 },
  tree4: { type: 'image', content: `${url}/images/tree4.png`, scale: 0.33 },
  reed1: { type: 'image', content: `${url}/images/reed1.png`, scale: 0.15 },
  reed2: { type: 'image', content: `${url}/images/reed2.png`, scale: 0.15 },
  moreStones: { type: 'image', content: `${url}/images/stone.png`, scale: 0.14 },
  none: { type: 'svg', content: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">  </svg>` }
};

// New mapping array for terrain details
const TERRAIN_DETAIL_MAPPING = [
  {
    terrain: 'GRASS', details:
      [
        'flower2',
        'flower3',
        'flower4',
        'flower5',
        'flower6',
        'stick',
        'tree4'],
    weights: [0.1, 0.2, 0.1, 0.1, 0.1, 0.2, 0.1], detailCache: 0.2
  },
  {
    terrain: 'FOREST', details: [
      'tree1', 'tree2', 'tree3',
    ], weights: [0.3, 0.3, 0.4], detailChance: 0.95
  },

  { terrain: 'MOUNTAIN', details: ['stone', 'moreStones'], weights: [0.7, 0.3] },
  { terrain: 'SAND', details: ['stick', 'bush'], weights: [0.8, 0.2] },
  { terrain: 'LAKE', details: ['lilyPad', "reed1", "reed2"], weights: [0.4, 0.4, 0.2], detailChance: 0.3 },
  { terrain: 'DEEP LAKE', details: ['lilyPad', "none"], weights: [0, 1] },
  { terrain: 'MOUNTAINPEAK', details: ['stone', 'moreStones'], weights: [0.7, 0.3] },
  { terrain: 'SNOW', details: ['none'], weights: [1] },
  { terrain: 'ICE', details: ['none'], weights: [1] },
  { terrain: 'SNOWY GRASS', details: ['none'], weights: [1] },


];

const DEFAULT_DETAIL = 'none';

export function generateTerrainDetails(detailCache) {
  const BASE_URL = window.location.origin + "/xplor";
  for (const [name, detail] of Object.entries(terrainDetails)) {
    let texture;
    if (detail.type === 'svg') {
      const blob = new Blob([detail.content], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      texture = PIXI.Texture.from(url);
    } else if (detail.type === 'image') {
      texture = PIXI.Texture.from(detail.content);
      texture.baseTexture.on('error', (error) => {
        console.error('Error loading texture:', detail.content, error);
      });
    }
    detailCache.set(name, texture);
  }
}
export function createTerrainDetail(terrain, detailCache, x, y, chunkContainer) {
  // Find terrain-specific mapping or fallback to default mapping
  const terrainMapping = TERRAIN_DETAIL_MAPPING.find(t => t.terrain === terrain) || { details: [DEFAULT_DETAIL], weights: [1] };

  // Determine the detail chance (use terrain-specific if present, else fallback to default)
  const detailChance = terrainMapping.detailChance !== undefined ? terrainMapping.detailChance : DETAIL_CHANCE;

  // Check if we should generate a detail based on the detail chance
  if (Math.random() >= detailChance) {
    return null;  // Skip creating a detail if random check fails
  }

  // If there are no details to choose from, return null
  if (terrainMapping.details.length === 0) {
    return null;
  }

  // Choose a detail based on weights
  const randomValue = Math.random();
  let cumulativeWeight = 0;
  let selectedDetail = DEFAULT_DETAIL;

  for (let i = 0; i < terrainMapping.details.length; i++) {
    cumulativeWeight += terrainMapping.weights[i];
    if (randomValue < cumulativeWeight) {
      selectedDetail = terrainMapping.details[i];
      break;
    }
  }

  // Fetch the texture and create a sprite
  const texture = detailCache.get(selectedDetail);
  const sprite = new PIXI.Sprite(texture);

  // Apply scaling to the sprite
  const scale = terrainDetails[selectedDetail]?.scale || DEFAULT_TERRAIN_SCALE;
  sprite.scale.set(scale);

  // Set position based on tile size and passed coordinates
  sprite.position.set(x * TILE_SIZE, y * TILE_SIZE);

  // Add the sprite to the chunk container
  chunkContainer.addChild(sprite);

  return sprite;
}
