import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';


import { createNoise2D } from 'simplex-noise';

import './App.css';

function App() {
  const appRef = useRef(null);

  useEffect(() => {
    // Constants
    const TILE_SIZE = 32;
    const VISIBLE_TILES = 30;
    const CHUNK_SIZE = 64;
    const LOAD_DISTANCE = 35;
    const NUM_NOISE_MAPS = 10;
    const DETAIL_CHANCE = 0.1;

    // Terrain types and colors
    const TERRAIN_TYPES = {
      GRASS: { light: 0x90EE90, dark: 0x228B22 },
      FOREST: { light: 0x228B22, dark: 0x006400 },
      LAKE: { light: 0x87CEFA, dark: 0x4682B4 },
      MOUNTAIN: { light: 0xA9A9A9, dark: 0x696969 },
      SAND: { light: 0xFAEBD7, dark: 0xD2B48C },
    };

    // Noise settings
    const TERRAIN_SCALE = 0.05;
    const TEXTURE_SCALE = 0.1;

    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xAAAAAA,
      resizeTo: window,
    });
    appRef.current.appendChild(app.view);

    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);

    const chunks = {};
    const simplex = createNoise2D();
    const noiseMaps = [];
    const tileCache = new Map();
    const detailCache = new Map();

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
          <rect x="3" y="12" width="10" height="2" fill="#8B4513"/>
          <rect x="4" y="11" width="8" height="1" fill="#A0522D"/>
          <rect x="4" y="14" width="8" height="1" fill="#8B4513"/>
        </svg>
      `
    };

    function generateNoiseMaps() {
      for (let i = 0; i < NUM_NOISE_MAPS; i++) {
        const noiseMap = new Array(TILE_SIZE * TILE_SIZE);
        for (let y = 0; y < TILE_SIZE; y++) {
          for (let x = 0; x < TILE_SIZE; x++) {
            const noise = simplex(x * 0.1, y * 0.1);
            noiseMap[y * TILE_SIZE + x] = (noise + 1) / 2;
          }
        }
        noiseMaps.push(noiseMap);
      }
    }

    function generateTerrainDetails() {
      for (const [name, svg] of Object.entries(terrainDetails)) {
        const blob = new Blob([svg], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const texture = PIXI.Texture.from(url);
        detailCache.set(name, texture);
      }
    }

    function generateWorld() {
      generateNoiseMaps();
      generateTerrainDetails();
      const centerChunkX = Math.floor(VISIBLE_TILES / 2 / CHUNK_SIZE);
      const centerChunkY = Math.floor(VISIBLE_TILES / 2 / CHUNK_SIZE);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          generateChunk(centerChunkX + x, centerChunkY + y);
        }
      }
    }

    function generateChunk(chunkX, chunkY) {
      const chunkKey = `${chunkX},${chunkY}`;
      if (chunks[chunkKey]) return;

      const chunkContainer = new PIXI.Container();
      chunkContainer.position.set(chunkX * CHUNK_SIZE * TILE_SIZE, chunkY * CHUNK_SIZE * TILE_SIZE);

      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldY = chunkY * CHUNK_SIZE + y;

          const terrainNoise = simplex(worldX * TERRAIN_SCALE, worldY * TERRAIN_SCALE);
          const terrain = getTerrainType(terrainNoise);

          const textureNoise = simplex(worldX * TEXTURE_SCALE, worldY * TEXTURE_SCALE);
          const baseColor = getTerrainColor(terrain, (textureNoise + 1) / 2);

          const tile = createTexturedTile(baseColor);
          tile.position.set(x * TILE_SIZE, y * TILE_SIZE);

          chunkContainer.addChild(tile);

          if (Math.random() < DETAIL_CHANCE) {
            const detail = createTerrainDetail(terrain);
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

    function createTexturedTile(baseColor) {
      const cacheKey = baseColor.toString(16).padStart(6, '0');
      if (tileCache.has(cacheKey)) {
        return new PIXI.Sprite(tileCache.get(cacheKey));
      }

      const noiseMap = noiseMaps[Math.floor(Math.random() * NUM_NOISE_MAPS)];
      const graphics = new PIXI.Graphics();

      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const noise = noiseMap[y * TILE_SIZE + x];
          const color = adjustColor(baseColor, noise);
          graphics.beginFill(color);
          graphics.drawRect(x, y, 1, 1);
          graphics.endFill();
        }
      }

      const texture = app.renderer.generateTexture(graphics);
      tileCache.set(cacheKey, texture);

      return new PIXI.Sprite(texture);
    }

    function createTerrainDetail(terrain) {
      let detailType;
      switch (terrain) {
        case 'GRASS':
        case 'FOREST':
          detailType = Math.random() < 0.7 ? 'flower' : 'stick';
          break;
        case 'MOUNTAIN':
          detailType = 'stone';
          break;
        case 'SAND':
          detailType = 'stick';
          break;
        default:
          return null;
      }

      const texture = detailCache.get(detailType);
      const sprite = new PIXI.Sprite(texture);
      sprite.scale.set(2);
      return sprite;
    }

    function adjustColor(baseColor, noise) {
      const r = (baseColor >> 16) & 0xFF;
      const g = (baseColor >> 8) & 0xFF;
      const b = baseColor & 0xFF;

      const factor = 0.8 + noise * 0.4;

      const newR = Math.min(255, Math.max(0, Math.floor(r * factor)));
      const newG = Math.min(255, Math.max(0, Math.floor(g * factor)));
      const newB = Math.min(255, Math.max(0, Math.floor(b * factor)));

      return (newR << 16) | (newG << 8) | newB;
    }

    function getTerrainType(noise) {
      if (noise < -0.5) return 'LAKE';
      if (noise < -0.2) return 'SAND';
      if (noise < 0.2) return 'GRASS';
      if (noise < 0.5) return 'FOREST';
      return 'MOUNTAIN';
    }

    function getTerrainColor(terrain, noise) {
      const { light, dark } = TERRAIN_TYPES[terrain];
      return PIXI.utils.rgb2hex([
        ((light >> 16) + ((dark >> 16) - (light >> 16)) * noise) / 255,
        (((light >> 8) & 0xFF) + (((dark >> 8) & 0xFF) - ((light >> 8) & 0xFF)) * noise) / 255,
        ((light & 0xFF) + ((dark & 0xFF) - (light & 0xFF)) * noise) / 255
      ]);
    }

    function setupInteraction() {
      let isDragging = false;
      let lastPosition = { x: 0, y: 0 };

      function onDragStart(event) {
        isDragging = true;
        lastPosition = event.data.global.clone();
      }

      function onDragMove(event) {
        if (isDragging) {
          const newPosition = event.data.global;
          const dx = newPosition.x - lastPosition.x;
          const dy = newPosition.y - lastPosition.y;
          
          worldContainer.position.x += dx;
          worldContainer.position.y += dy;
          
          lastPosition = newPosition.clone();
          
          checkChunkGeneration();
        }
      }

      function onDragEnd() {
        isDragging = false;
      }

      app.stage.eventMode = 'static';
      app.stage.hitArea = app.screen;
      app.stage
        .on('pointerdown', onDragStart)
        .on('pointermove', onDragMove)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd);
    }

    function checkChunkGeneration() {
      const cameraX = -worldContainer.position.x / TILE_SIZE;
      const cameraY = -worldContainer.position.y / TILE_SIZE;

      const minChunkX = Math.floor((cameraX - LOAD_DISTANCE) / CHUNK_SIZE);
      const maxChunkX = Math.ceil((cameraX + VISIBLE_TILES + LOAD_DISTANCE) / CHUNK_SIZE);
      const minChunkY = Math.floor((cameraY - LOAD_DISTANCE) / CHUNK_SIZE);
      const maxChunkY = Math.ceil((cameraY + VISIBLE_TILES + LOAD_DISTANCE) / CHUNK_SIZE);

      for (let x = minChunkX; x <= maxChunkX; x++) {
        for (let y = minChunkY; y <= maxChunkY; y++) {
          generateChunk(x, y);
        }
      }
    }

    // Initialize
    generateWorld();
    setupInteraction();

    return () => {
      app.destroy(true, true);
    };
  }, []);

  return <div ref={appRef} id="game-container" />;
}

export default App;