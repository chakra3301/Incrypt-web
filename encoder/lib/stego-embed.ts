import { TILE, DEFAULT_BITS } from "./constants";
import { paintPointillistCanvas } from "./pointillist";

/** Paint a random pointillist canvas of size TILE×TILE. */
function paintCanvas(rng: () => number): Uint8ClampedArray {
  const side = TILE;
  const data = new Uint8ClampedArray(side * side * 4); // RGBA
  data.fill(255); // white bg

  const dots = Math.max(1, (side * side) >> 4); // side² / 16

  for (let i = 0; i < dots; i++) {
    const x = (rng() * side) | 0;
    const y = (rng() * side) | 0;
    const r = (rng() * 256) | 0;
    const g = (rng() * 256) | 0;
    const b = (rng() * 256) | 0;

    const idx = 4 * (y * side + x);
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  }
  return data;
}

/** Embed payload bytes into `data`'s RGB channels, `bitsPerChannel` LSBs each. */
function embedLSBs(payload: Uint8Array, data: Uint8ClampedArray, bitsPerChannel: number) {
  const capBits = (data.length / 4) * 3 * bitsPerChannel;
  const bits = payload.length * 8;
  if (bits > capBits) throw new Error("tile overflow");

  const clearMask = 0xff ^ ((1 << bitsPerChannel) - 1);
  let pBitIdx = 0;

  // walk pixels
  for (let px = 0; px < data.length; px += 4) {
    for (let ch = 0; ch < 3; ch++) {
      // R,G,B only
      const originalByte = data[px + ch];
      
      // Preserve the upper bits and only modify the LSBs
      let modifiedByte = originalByte & clearMask;

      for (let bit = 0; bit < bitsPerChannel && pBitIdx < bits; bit++, pBitIdx++) {
        const srcBit = (payload[pBitIdx >> 3] >> (pBitIdx & 7)) & 1;
        modifiedByte |= srcBit << bit;
      }
      
      data[px + ch] = modifiedByte;
      if (pBitIdx >= bits) return; // done
    }
  }
}

/** Produce a PNG blob URL that hides `payload`. */
export async function embedTile(
  payload: Uint8Array,
  bitsPerChannel: number = DEFAULT_BITS,
  imageData?: ImageData,
  tileX: number = 0,
  tileY: number = 0,
  rng: () => number = Math.random
): Promise<string> {
  // Pad payload to tile capacity
  const capBytes = (TILE * TILE * 3 * bitsPerChannel) >> 3;
  const buf = new Uint8Array(capBytes);
  buf.fill(0); // Initialize with zeros
  
  // Copy payload data (may be less than capacity)
  const bytesToCopy = Math.min(payload.length, capBytes);
  if (bytesToCopy > 0) {
    buf.set(payload.subarray(0, bytesToCopy));
  }
  
  // Debug logging for specific tiles
  if (tileX === 0 && tileY === 0) {
    console.log(`\n[embedTile] Embedding at (${tileX}, ${tileY})`);
    console.log(`  Payload size: ${payload.length} bytes`);
    console.log(`  Capacity: ${capBytes} bytes`);
    console.log(`  Bytes to copy: ${bytesToCopy} bytes`);
    const hex = Array.from(buf.slice(0, Math.min(20, bytesToCopy)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`  Buffer first 20 bytes: ${hex}`);
  }

  let imgData: Uint8ClampedArray;
  
  if (imageData) {
    // Extract the tile from the provided image
    const canvas = new OffscreenCanvas(TILE, TILE);
    const ctx = canvas.getContext("2d")!;
    
    // Fill with white first - white has all bits set to 1
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, TILE, TILE);
    
    // Check if this tile is within the image bounds
    if (tileX < imageData.width && tileY < imageData.height) {
      // Calculate how much of the image falls within this tile
      const sourceWidth = Math.min(TILE, imageData.width - tileX);
      const sourceHeight = Math.min(TILE, imageData.height - tileY);
      
      if (sourceWidth > 0 && sourceHeight > 0) {
        // Draw the image data offset so the tile region appears at (0,0)
        ctx.putImageData(imageData, -tileX, -tileY);
      }
    }
    
    const tileImageData = ctx.getImageData(0, 0, TILE, TILE);
    imgData = tileImageData.data;
  } else {
    // Generate random pointillist art
    imgData = paintCanvas(rng);
  }

  embedLSBs(buf, imgData, bitsPerChannel);
  
  // Debug: Check first few pixels after embedding
  if (tileX === 0 && tileY === 0) {
    console.log(`[embedTile] After embedding, first 10 pixels (RGBA):`);
    for (let i = 0; i < 40; i += 4) {
      console.log(`  Pixel ${i/4}: R=${imgData[i]}, G=${imgData[i+1]}, B=${imgData[i+2]}, A=${imgData[i+3]}`);
    }
  }

  const canvas = new OffscreenCanvas(TILE, TILE);
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(imgData, TILE, TILE), 0, 0);

  const blob = await canvas.convertToBlob({ 
    type: "image/png"
    // PNG is always lossless, quality parameter is ignored
  });
  canvas.width = canvas.height = 0; // free GPU/CPU
  return URL.createObjectURL(blob); // caller must revoke
}

/** Extract payload bytes from image data's RGB channels */
export function extractLSBs(data: Uint8ClampedArray, bitsPerChannel: number): Uint8Array {
  const capBytes = (data.length / 4) * 3 * bitsPerChannel >> 3;
  const result = new Uint8Array(capBytes);
  
  let pBitIdx = 0;
  
  // Walk pixels - must match the embedding order exactly
  for (let px = 0; px < data.length; px += 4) {
    for (let ch = 0; ch < 3; ch++) { // R,G,B only
      const byte = data[px + ch];
      
      for (let bit = 0; bit < bitsPerChannel && pBitIdx < capBytes * 8; bit++, pBitIdx++) {
        const extractedBit = (byte >> bit) & 1;
        if (extractedBit) {
          result[pBitIdx >> 3] |= (1 << (pBitIdx & 7));
        }
      }
    }
  }
  
  return result;
}