import * as PIXI from 'pixi.js';

// Pixel art terrain details
const terrainDetails = {
  stone: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="4" y="8" width="8" height="6" fill="#808080"/>
      <rect x="3" y="9" width="1" height="4" fill="#696969"/>
      <rect x="12" y="9" width="1" height="4" fill="#969696"/>
      <rect x="5" y="7" width="6" height="1" fill="#969696"/>
      <rect x="5" y="14" width="6" height="1" fill="#696969"/>
    </svg>
  `,
  flower: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="7" y="8" width="2" height="7" fill="#228B22"/>
      <rect x="6" y="4" width="4" height="4" fill="#FF69B4"/>
      <rect x="5" y="5" width="2" height="2" fill="#FF69B4"/>
      <rect x="9" y="5" width="2" height="2" fill="#FF69B4"/>
      <rect x="7" y="3" width="2" height="2" fill="#FF69B4"/>
      <rect x="7" y="7" width="2" height="2" fill="#FF69B4"/>
    </svg>
  `,
  stick: `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <rect x="5" y="11" width="6" height="1" fill="#8B4513"/>
    <rect x="7" y="9" width="1" height="2" fill="#8B4513"/>
    <rect x="6" y="12" width="1" height="3" fill="#A0522D"/>
    <rect x="9" y="12" width="1" height="3" fill="#A0522D"/>
  </svg>
`,

  lilyPad: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <ellipse cx="8" cy="8" rx="7" ry="3" fill="#006400"/>
      <ellipse cx="8" cy="8" rx="5" ry="2" fill="#008000"/>
    </svg>
  `,
  bush: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="5" cy="11" r="3" fill="#228B22"/>
      <circle cx="11" cy="11" r="3" fill="#228B22"/>
      <circle cx="8" cy="8" r="3" fill="#228B22"/>
    </svg>
  `,
  moreStones: `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="3" y="11" width="2" height="2" fill="#808080"/>
      <rect x="11" y="11" width="2" height="2" fill="#808080"/>
      <rect x="7" y="7" width="2" height="2" fill="#808080"/>
    </svg>
  `,
  
  none: `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">

  </svg>
`
};

// New mapping array for terrain details
const TERRAIN_DETAIL_MAPPING = [
  { terrain: 'GRASS', details: ['flower', 'stick', 'bush' ], weights: [0.4, 0.2, 0.4 ] },
  { terrain: 'FOREST', details: ['flower', 'stick', 'bush'], weights: [0.4, 0.2, 0.4] },
  { terrain: 'MOUNTAIN', details: ['stone', 'moreStones'], weights: [0.7, 0.3] },
  { terrain: 'SAND', details: ['stick', 'bush'], weights: [0.8, 0.2] },
  { terrain: 'LAKE', details: ['lilyPad',"none"], weights: [0.3,0.9] }
];

const DEFAULT_DETAIL = 'stick';

export function generateTerrainDetails(detailCache) {
  for (const [name, svg] of Object.entries(terrainDetails)) {
    const blob = new Blob([svg], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const texture = PIXI.Texture.from(url);
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
  sprite.scale.set(2);
  return sprite;
}