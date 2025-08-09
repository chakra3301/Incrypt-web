// File format utilities for encoding/decoding metadata

export interface FileMetadata {
  originalSize: number;
  checksum?: number;
  filename?: string;
  mimeType?: string;
  compressed?: boolean;
  compressedSize?: number;
}

// Magic marker to identify our encoded files
export const MAGIC_MARKER = new Uint8Array([0x53, 0x54, 0x45, 0x47, 0x4F, 0x33]); // "STEGO3" (v3 with compression)

// Simple checksum for data integrity
function calculateChecksum(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum = ((sum << 1) | (sum >>> 31)) ^ data[i]; // Rotate left and XOR
  }
  return sum >>> 0; // Ensure unsigned 32-bit
}

export function encodeWithMetadata(data: Uint8Array, metadata: FileMetadata): Uint8Array {
  // Calculate checksum
  const checksum = calculateChecksum(data);
  
  // Create header: MAGIC(6) + SIZE(4) + CHECKSUM(4) + FLAGS(1) + COMPRESSED_SIZE(4) = 19 bytes
  const header = new Uint8Array(19);
  
  // Write magic marker
  header.set(MAGIC_MARKER, 0);
  
  // Write original size and checksum as 32-bit integers (little-endian)
  const view = new DataView(header.buffer);
  view.setUint32(6, metadata.originalSize, true);
  view.setUint32(10, checksum, true);
  
  // Build optional filename/mimeType metadata block
  const hasExtraMeta = Boolean(metadata.filename || metadata.mimeType);
  const encoder = new TextEncoder();
  const filenameBytes = metadata.filename ? encoder.encode(metadata.filename) : new Uint8Array(0);
  const mimeBytes = metadata.mimeType ? encoder.encode(metadata.mimeType) : new Uint8Array(0);
  let extraMeta: Uint8Array | undefined;
  if (hasExtraMeta) {
    // Layout: FNLEN(2) + FNB(FNLEN) + MMLEN(2) + MMB(MMLEN)
    const metaHeader = new Uint8Array(4);
    const metaView = new DataView(metaHeader.buffer);
    metaView.setUint16(0, filenameBytes.length, true);
    metaView.setUint16(2, mimeBytes.length, true);
    extraMeta = new Uint8Array(4 + filenameBytes.length + mimeBytes.length);
    extraMeta.set(metaHeader, 0);
    extraMeta.set(filenameBytes, 4);
    extraMeta.set(mimeBytes, 4 + filenameBytes.length);
  }

  // Write flags (bit 0 = compressed, bit 1 = has extra meta)
  const flags = (metadata.compressed ? 0x01 : 0x00) | (hasExtraMeta ? 0x02 : 0x00);
  view.setUint8(14, flags);
  
  // Write compressed size
  view.setUint32(15, metadata.compressedSize || data.length, true);
  
  // Combine header + optional extra meta + data
  if (extraMeta) {
    const result = new Uint8Array(header.length + extraMeta.length + data.length);
    result.set(header, 0);
    result.set(extraMeta, header.length);
    result.set(data, header.length + extraMeta.length);
    
    // Debug logging
    console.log(`[encodeWithMetadata] Created header+extraMeta+data: ${result.length} bytes`);
    console.log(`  Header (19 bytes): ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  Extra meta (${extraMeta.length} bytes) FNLEN=${filenameBytes.length}, MMLEN=${mimeBytes.length}`);
    console.log(`  Data starts with: ${Array.from(data.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  Result starts with: ${Array.from(result.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    return result;
  } else {
    const result = new Uint8Array(header.length + data.length);
    result.set(header, 0);
    result.set(data, header.length);
    
    // Debug logging
    console.log(`[encodeWithMetadata] Created header+data: ${result.length} bytes`);
    console.log(`  Header (19 bytes): ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  Data starts with: ${Array.from(data.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    console.log(`  Result starts with: ${Array.from(result.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    
    return result;
  }
}

export function decodeWithMetadata(data: Uint8Array): { data: Uint8Array; metadata: FileMetadata } | null {
  // Check if we have at least the minimum header
  if (data.length < 14) {
    return null;
  }
  
  // Check magic marker
  let hasMarker = true;
  for (let i = 0; i < MAGIC_MARKER.length; i++) {
    if (data[i] !== MAGIC_MARKER[i]) {
      hasMarker = false;
      break;
    }
  }
  
  if (!hasMarker) {
    // Check for old version markers
    const OLD_MARKER_V2 = new Uint8Array([0x53, 0x54, 0x45, 0x47, 0x4F, 0x32]); // "STEGO2"
    const OLD_MARKER_V1 = new Uint8Array([0x53, 0x54, 0x45, 0x47, 0x4F, 0x31]); // "STEGO1"
    
    let hasV2Marker = true;
    for (let i = 0; i < OLD_MARKER_V2.length; i++) {
      if (data[i] !== OLD_MARKER_V2[i]) {
        hasV2Marker = false;
        break;
      }
    }
    
    if (hasV2Marker && data.length >= 14) {
      // V2 format with checksum but no compression
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const originalSize = view.getUint32(6, true);
      const storedChecksum = view.getUint32(10, true);
      const actualData = data.slice(14, 14 + originalSize);
      return {
        data: actualData,
        metadata: { originalSize, checksum: storedChecksum }
      };
    }
    
    let hasV1Marker = true;
    for (let i = 0; i < OLD_MARKER_V1.length; i++) {
      if (data[i] !== OLD_MARKER_V1[i]) {
        hasV1Marker = false;
        break;
      }
    }
    
    if (hasV1Marker && data.length >= 10) {
      // V1 format without checksum
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const originalSize = view.getUint32(6, true);
      const actualData = data.slice(10, 10 + originalSize);
      return {
        data: actualData,
        metadata: { originalSize }
      };
    }
    
    // No header - return as-is
    return {
      data: data,
      metadata: { originalSize: data.length }
    };
  }
  
  // Check if we have V3 format (with compression info)
  if (data.length < 19) {
    // V2 format - no compression info
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const originalSize = view.getUint32(6, true);
    const storedChecksum = view.getUint32(10, true);
    const actualData = data.slice(14, 14 + originalSize);
    return {
      data: actualData,
      metadata: { originalSize, checksum: storedChecksum }
    };
  }
  
  // Read V3 metadata
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const originalSize = view.getUint32(6, true);
  const storedChecksum = view.getUint32(10, true);
  const flags = view.getUint8(14);
  const compressedSize = view.getUint32(15, true);
  
  const compressed = (flags & 0x01) !== 0;
  const hasExtraMeta = (flags & 0x02) !== 0;
  let filename: string | undefined;
  let mimeType: string | undefined;
  
  // Determine where data starts
  let dataOffset = 19;
  if (hasExtraMeta) {
    try {
      // FNLEN(2) + FNB(FNLEN) + MMLEN(2) + MMB(MMLEN)
      const fnLen = view.getUint16(dataOffset, true);
      const fnStart = dataOffset + 2;
      const mmLenOffset = fnStart + fnLen;
      const mmLen = view.getUint16(mmLenOffset, true);
      const mmStart = mmLenOffset + 2;
      const nextOffset = mmStart + mmLen;
      
      // Bounds checks relative to the typed array length (not ArrayBuffer absolute offsets)
      if (fnLen > 0 && fnStart >= 0 && fnStart + fnLen <= data.length) {
        const fnBytes = data.slice(fnStart, fnStart + fnLen);
        filename = new TextDecoder().decode(fnBytes);
      }
      if (mmLen > 0 && mmStart >= 0 && mmStart + mmLen <= data.length) {
        const mmBytes = data.slice(mmStart, mmStart + mmLen);
        mimeType = new TextDecoder().decode(mmBytes);
      }
      // Advance dataOffset just past the extra metadata block
      dataOffset = Math.min(nextOffset, data.length);
    } catch (e) {
      console.warn('Failed to parse extra metadata block, falling back to default offsets');
      dataOffset = 19; // fallback
    }
  }
  
  // Extract actual data with clamped bounds
  const start = Math.max(0, Math.min(dataOffset, data.length));
  const end = Math.max(start, Math.min(dataOffset + compressedSize, data.length));
  const actualData = data.slice(start, end);
  
  console.log(`[decodeWithMetadata] Extracting compressed data:`);
  console.log(`  Data starts at byte ${start}, length: ${end - start} (requested ${compressedSize})`);
  console.log(`  First 40 bytes of full data: ${Array.from(data.slice(0, 40)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  console.log(`  Extracted data first 20 bytes: ${Array.from(actualData.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  
  // Verify checksum
  const calculatedChecksum = calculateChecksum(actualData);
  if (calculatedChecksum !== storedChecksum) {
    console.error(`Checksum mismatch! Stored: ${storedChecksum}, Calculated: ${calculatedChecksum}`);
    
    // Log more details about the mismatch
    console.log(`Data size: ${actualData.length} bytes`);
    const first20 = Array.from(actualData.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const last20 = Array.from(actualData.slice(-20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`First 20 bytes: ${first20}`);
    console.log(`Last 20 bytes: ${last20}`);
    
    // Find where data starts to differ
    let firstDiffByte = -1;
    for (let i = 0; i < actualData.length; i++) {
      if (actualData[i] !== 0 && i > 1000) {
        // Just a simple check - we expect PNG data
        break;
      }
    }
  }
  
  return {
    data: actualData,
    metadata: { 
      originalSize,
      checksum: storedChecksum,
      compressed,
      compressedSize,
      filename,
      mimeType
    }
  };
}