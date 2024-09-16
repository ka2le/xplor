import * as PIXI from 'pixi.js';

const DEFAULT_TERRAIN_SCALE = 3;
// Pixel art terrain details
const url=window.location.origin+"/xplor";
const terrainDetails = {
  stone: { type: 'image', content: `${url}/images/stone.png`, scale: 0.14 },
  flower: { type: 'image', content: `${url}/images/flower2.png`, scale: 0.14 },
  stick: { type: 'image', content: `${url}/images/stick.png`, scale: 0.14 },
  lilyPad: { type: 'image', content: `${url}/images/lilypad.png`, scale: 0.14 },
  bush: { type: 'image', content: `${url}/images/tree.png`, scale: 0.26 },
  moreStones: { type: 'image', content: `${url}/images/stone.png`, scale: 0.14 },
  none: { type: 'svg', content: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">  </svg>` }
};

// New mapping array for terrain details
const TERRAIN_DETAIL_MAPPING = [
  { terrain: 'GRASS', details: ['flower', 'stick', 'bush'], weights: [0.4, 0.2, 0.4] },
  { terrain: 'FOREST', details: ['flower', 'stick', 'bush'], weights: [0.4, 0.2, 0.4] },
  { terrain: 'MOUNTAIN', details: ['stone', 'moreStones'], weights: [0.7, 0.3] },
  { terrain: 'SAND', details: ['stick', 'bush'], weights: [0.8, 0.2] },
  { terrain: 'LAKE', details: ['lilyPad', "none"], weights: [0.4, 0.6] },
  { terrain: 'DEEP LAKE', details: ['lilyPad', "none"], weights: [0, 1] },
  { terrain: 'MOUNTAINPEAK', details: ['stone', 'moreStones'], weights: [0.7, 0.3] },
  { terrain: 'SNOW', details: ['none'], weights: [1] },
  { terrain: 'ICE', details: ['none'], weights: [1] },
  { terrain: 'SNOWY GRASS', details: ['none'], weights: [1] },


];

const DEFAULT_DETAIL = 'stick';

export function generateTerrainDetails(detailCache) {
  const BASE_URL = window.location.origin+"/xplor";
  for (const [name, detail] of Object.entries(terrainDetails)) {
    let texture;
    if (detail.type === 'svg') {
      const blob = new Blob([detail.content], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      texture = PIXI.Texture.from(url);
    } else if (detail.type === 'image') {
      // Set crossOrigin handling for image
      texture = PIXI.Texture.from(detail.content);
      texture.baseTexture.on('error', (error) => {
        console.error('Error loading texture:', detail.content, error);
      });
    }
    detailCache.set(name, texture);
  }
}

export function createTerrainDetail(terrain, detailCache) {
  const terrainMapping = TERRAIN_DETAIL_MAPPING.find(t => t.terrain === terrain) || { details: [DEFAULT_DETAIL], weights: [1] };

  if (terrainMapping.details.length === 0) {
    return null;
  }

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

  const texture = detailCache.get(selectedDetail);
  const sprite = new PIXI.Sprite(texture);
  const scale = terrainDetails[selectedDetail].scale || DEFAULT_TERRAIN_SCALE;  // Use default scale of 1 if not specified
  sprite.scale.set(scale);  // Apply the scale
  return sprite;
}
