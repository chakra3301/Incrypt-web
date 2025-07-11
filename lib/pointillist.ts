import { TILE } from "./constants";

/** 
 * Create a pointillist representation of the source image on a canvas of any size.
 * This allows us to expand the canvas beyond the source image dimensions while
 * maintaining the visual appearance through dot sampling.
 */
export function paintPointillistCanvas(
  sourceImageData: ImageData,
  canvasWidth: number,
  canvasHeight: number,
  dots?: number,
  jitter: number = 6,
  dotRadius: number = 1,
  rng: () => number = Math.random
): Uint8ClampedArray {
  const srcWidth = sourceImageData.width;
  const srcHeight = sourceImageData.height;
  const srcData = sourceImageData.data;
  
  // Create output canvas filled with average color of source image for better base
  const canvasData = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  
  // Calculate average color of source image
  let avgR = 0, avgG = 0, avgB = 0;
  const pixelCount = srcWidth * srcHeight;
  for (let i = 0; i < srcData.length; i += 4) {
    avgR += srcData[i];
    avgG += srcData[i + 1];
    avgB += srcData[i + 2];
  }
  avgR = Math.round(avgR / pixelCount);
  avgG = Math.round(avgG / pixelCount);
  avgB = Math.round(avgB / pixelCount);
  
  // Fill with average color
  for (let i = 0; i < canvasData.length; i += 4) {
    canvasData[i] = avgR;
    canvasData[i + 1] = avgG;
    canvasData[i + 2] = avgB;
    canvasData[i + 3] = 255;
  }
  
  // Calculate number of dots if not specified - use more dots for better quality
  const numDots = dots || Math.max(100, (canvasWidth * canvasHeight) >> 2); // area / 4 for denser coverage
  
  // Bilinear interpolation to sample color from source image
  const bilinearSample = (xNorm: number, yNorm: number): [number, number, number] => {
    // Map normalized coords [0,1) to source image coords
    const u = xNorm * (srcWidth - 1);
    const v = yNorm * (srcHeight - 1);
    
    const x0 = Math.floor(u);
    const y0 = Math.floor(v);
    const x1 = Math.min(x0 + 1, srcWidth - 1);
    const y1 = Math.min(y0 + 1, srcHeight - 1);
    
    const a = u - x0;
    const b = v - y0;
    
    // Get colors at four corners
    const idx00 = (y0 * srcWidth + x0) * 4;
    const idx10 = (y0 * srcWidth + x1) * 4;
    const idx01 = (y1 * srcWidth + x0) * 4;
    const idx11 = (y1 * srcWidth + x1) * 4;
    
    // Bilinear interpolation for each channel
    const r = (1 - b) * ((1 - a) * srcData[idx00] + a * srcData[idx10]) +
              b * ((1 - a) * srcData[idx01] + a * srcData[idx11]);
    const g = (1 - b) * ((1 - a) * srcData[idx00 + 1] + a * srcData[idx10 + 1]) +
              b * ((1 - a) * srcData[idx01 + 1] + a * srcData[idx11 + 1]);
    const bl = (1 - b) * ((1 - a) * srcData[idx00 + 2] + a * srcData[idx10 + 2]) +
               b * ((1 - a) * srcData[idx01 + 2] + a * srcData[idx11 + 2]);
    
    return [Math.round(r), Math.round(g), Math.round(bl)];
  };
  
  // Generate dots
  for (let i = 0; i < numDots; i++) {
    // Random normalized coordinates
    const xNorm = rng();
    const yNorm = rng();
    
    // Scale to canvas coordinates
    const cx = Math.floor(xNorm * canvasWidth);
    const cy = Math.floor(yNorm * canvasHeight);
    
    // Sample color from source image
    const [r, g, b] = bilinearSample(xNorm, yNorm);
    
    // Add jitter
    const finalR = Math.max(0, Math.min(255, r + Math.floor((rng() - 0.5) * 2 * jitter)));
    const finalG = Math.max(0, Math.min(255, g + Math.floor((rng() - 0.5) * 2 * jitter)));
    const finalB = Math.max(0, Math.min(255, b + Math.floor((rng() - 0.5) * 2 * jitter)));
    
    // Draw dot with soft edges for better blending
    const yMin = Math.max(0, cy - dotRadius);
    const yMax = Math.min(canvasHeight, cy + dotRadius + 1);
    const xMin = Math.max(0, cx - dotRadius);
    const xMax = Math.min(canvasWidth, cx + dotRadius + 1);
    
    for (let y = yMin; y < yMax; y++) {
      for (let x = xMin; x < xMax; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= dotRadius) {
          const idx = (y * canvasWidth + x) * 4;
          
          // For larger dots, blend with existing color at edges
          if (dotRadius > 1 && distance > dotRadius - 1) {
            const blend = 1 - (distance - (dotRadius - 1));
            canvasData[idx] = Math.round(canvasData[idx] * (1 - blend) + finalR * blend);
            canvasData[idx + 1] = Math.round(canvasData[idx + 1] * (1 - blend) + finalG * blend);
            canvasData[idx + 2] = Math.round(canvasData[idx + 2] * (1 - blend) + finalB * blend);
          } else {
            canvasData[idx] = finalR;
            canvasData[idx + 1] = finalG;
            canvasData[idx + 2] = finalB;
          }
          canvasData[idx + 3] = 255;
        }
      }
    }
  }
  
  return canvasData;
}