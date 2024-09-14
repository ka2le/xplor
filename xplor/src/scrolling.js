import { NUM_NOISE_MAPS, TILE_SIZE, CHUNK_SIZE, VISIBLE_TILES, DETAIL_CHANCE, LOAD_DISTANCE } from './configs';
import { generateChunk } from './Terrain';

export function setupInteraction( tileCache, noiseMaps, app,chunks,simplex, worldContainer,detailCache) {
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

            checkChunkGeneration( tileCache, noiseMaps, app,chunks,simplex, worldContainer,detailCache);
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


function checkChunkGeneration( tileCache, noiseMaps, app,chunks,simplex, worldContainer,detailCache) {
    const cameraX = -worldContainer.position.x / TILE_SIZE;
    const cameraY = -worldContainer.position.y / TILE_SIZE;

    const minChunkX = Math.floor((cameraX - LOAD_DISTANCE) / CHUNK_SIZE);
    const maxChunkX = Math.ceil((cameraX + VISIBLE_TILES + LOAD_DISTANCE) / CHUNK_SIZE);
    const minChunkY = Math.floor((cameraY - LOAD_DISTANCE) / CHUNK_SIZE);
    const maxChunkY = Math.ceil((cameraY + VISIBLE_TILES + LOAD_DISTANCE) / CHUNK_SIZE);

    for (let x = minChunkX; x <= maxChunkX; x++) {
      for (let y = minChunkY; y <= maxChunkY; y++) {
        generateChunk(x, y, tileCache, noiseMaps, app,chunks,simplex, worldContainer,detailCache);
      }
    }
  }