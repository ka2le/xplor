import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { Color } from 'pixi.js';
import { generateTerrainDetails,createTerrainDetail,  } from './TerrainDetails';
import { adjustColor } from './utils';
import { setupInteraction } from './scrolling';
import { generateChunk,generateTextureNoiseMaps } from './Terrain';

import { createNoise2D } from 'simplex-noise';
import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE,TERRAIN_SCALE,TEXTURE_SCALE } from './configs';

import './App.css';

function App() {
  const appRef = useRef(null);

  useEffect(() => {
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xAAAAAA,
      resizeTo: window,
    });
    appRef.current.appendChild(app.view);
    const worldContainer = new PIXI.Container();
    app.stage.addChild(worldContainer);
    const simplex = createNoise2D();
    const textureNoiseMaps = [];
    const chunks = {};
    const tileCache = new Map();
    const detailCache = new Map();

    function generateWorld() {
      generateTextureNoiseMaps(textureNoiseMaps);
      generateTerrainDetails(detailCache);
      const centerChunkX = Math.floor(VISIBLE_TILES / 2 / CHUNK_SIZE);
      const centerChunkY = Math.floor(VISIBLE_TILES / 2 / CHUNK_SIZE);

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          generateChunk(centerChunkX + x, centerChunkY + y,  tileCache, textureNoiseMaps, app,chunks,simplex, worldContainer,detailCache);
        }
      }
    }

    // Initialize
    generateWorld();
    setupInteraction( tileCache, textureNoiseMaps, app,chunks,simplex, worldContainer,detailCache);

    return () => {
      app.destroy(true, true);
    };
  }, []);

  return <div ref={appRef} id="game-container" />;
}

export default App;


