"use client";

import { useRef, useState, useEffect } from "react";
import { DEFAULT_BITS, MAX_BITS, TILE } from "../lib/constants";

type Mode = "encode" | "decode";

function getMaxCanvasSize(): number {
  // Try to create a canvas of increasing size until it fails
  const ctx = document.createElement('canvas').getContext('2d');
  let size = 4096; // Start with a safe value for mobile
  try {
    while (size <= 32768) {
      ctx!.canvas.width = ctx!.canvas.height = size;
      ctx!.getImageData(0, 0, 1, 1);
      size += 1024;
    }
  } catch (e) {
    // Failed at this size, so last working size is (size - 1024)
    return size - 1024;
  }
  return size - 1024;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("encode");
  const [pct, setPct] = useState(0);
  const [dl, setDl] = useState<string>();
  const [dataFile, setDataFile] = useState<File>();
  const [textMessage, setTextMessage] = useState<string>("");
  const [encodeType, setEncodeType] = useState<"file" | "text">("file");
  const [imageFile, setImageFile] = useState<File>();
  const [processing, setProcessing] = useState(false);
  const [bits, setBits] = useState(DEFAULT_BITS);
  const [imageCapacity, setImageCapacity] = useState<number>(0);
  const [autoExpand, setAutoExpand] = useState(true);
  const [preserveQuality, setPreserveQuality] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const [maxCanvas, setMaxCanvas] = useState<number>(25000);
  const [decodedText, setDecodedText] = useState<string>("");

  useEffect(() => {
    setMaxCanvas(getMaxCanvasSize());
  }, []);

  // Calculate capacity when image or bits change
  useEffect(() => {
    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        const capacity = calculateCapacity(img.width, img.height, bits);
        setImageCapacity(capacity);
      };
      img.src = URL.createObjectURL(imageFile);
      return () => URL.revokeObjectURL(img.src);
    } else {
      setImageCapacity(0);
    }
  }, [imageFile, bits]);

  const calculateCapacity = (width: number, height: number, bitsPerChannel: number) => {
    return (width * height * 3 * bitsPerChannel) >> 3; // bytes
  };

  const handleEncode = async () => {
    if (!dataFile) return;
    
    setProcessing(true);
    const dataURL = URL.createObjectURL(dataFile);
    
    // Convert image to blob URL if provided
    let imageURL: string | undefined;
    if (imageFile) {
      imageURL = URL.createObjectURL(imageFile);
    }
    
    const worker = new Worker(
      new URL("../workers/stego-worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = ({ data }) => {
      if (data.pct !== undefined) setPct(data.pct);
      if (data.done) {
        console.log("PNG blob size:", data.png.size / 1024 / 1024, "MB");
        const link = URL.createObjectURL(data.png);
        setDl(link);
        setPct(1);
        setProcessing(false);
      }
      if (data.error) {
        alert(data.error);
        setProcessing(false);
      }
    };
    
    worker.postMessage({ 
      type: "encode", 
      dataURL,
      imageURL,
      bits,
      autoExpand,
      maxCanvas // Pass the detected max canvas size
    });
  };

  const handleDecode = (file: File) => {
    setProcessing(true);
    setPct(0);
    setDecodedText("");
    const imageURL = URL.createObjectURL(file);
    const worker = new Worker(
      new URL("../workers/decode-worker.ts", import.meta.url),
      { type: "module" }
    );
    worker.onmessage = async ({ data }) => {
      if (data.pct !== undefined) setPct(data.pct);
      if (data.done) {
        const link = URL.createObjectURL(data.blob);
        setDl(link);
        setPct(1);
        setProcessing(false);
        // Store decode result info for display
        (window as any).decodeResult = {
          suggestedName: data.suggestedName,
          fileSize: data.fileSize,
          detectedType: data.detectedType
        };
        // If it's text, read and display
        if (
          data.blob &&
          (data.detectedType?.toLowerCase().includes("text") ||
            data.blob.type === "text/plain")
        ) {
          const text = await data.blob.text();
          setDecodedText(text);
        }
      }
      if (data.error) {
        alert(data.error);
        setProcessing(false);
      }
    };
    worker.postMessage({
      type: "decode",
      imageURL,
      bits, // Use the current bits setting
      maxCanvas // Pass the detected max canvas size
    });
  };

  const clear = () => {
    if (dl) URL.revokeObjectURL(dl);
    setDl(undefined);
    setPct(0);
    setDataFile(undefined);
    setTextMessage("");
    setImageFile(undefined);
  };

  return (
    <>
      {/* Header */}
      <header className="header">
        <img src="/assets/dotlock.png" alt="Logo" className="header-logo" />
        <nav className="header-nav">
          <a href="/index.html" className="nav-button">Home</a>
        </nav>
      </header>

      {/* Matrix Canvas */}
      <canvas id="matrixCanvas"></canvas>

      <main className="container" style={{ marginTop: '90px' }}>
        <h1 className="text-2xl font-semibold mb-6">GPT‑1 Stego PNG Maker</h1>

        {/* Mode selector */}
        <div className="flex gap-4 justify-center mb-6">
          <button
            onClick={() => { setMode("encode"); clear(); }}
            className={`px-4 py-2 rounded ${
              mode === "encode" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Encode Data → PNG
          </button>
          <button
            onClick={() => { setMode("decode"); clear(); }}
            className={`px-4 py-2 rounded ${
              mode === "decode" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Decode PNG → Data
          </button>
        </div>

        {/* Encode mode */}
        {mode === "encode" && !dl && (
          <div className="flex flex-col gap-4 w-full">
            {/* Cover image input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Select cover image (optional):
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && setImageFile(e.target.files[0])}
                className="w-full"
              />
              <p className="text-sm text-gray-400 mt-1">
                If no image provided, random pointillist art will be generated
              </p>
            </div>

            {imageFile && (
              <div className="bg-purple-900/20 p-4 rounded border border-purple-500/30">
                <p className="text-sm">Cover image: {imageFile.name}</p>
                <p className="text-sm text-gray-400">
                  Capacity: {(imageCapacity / 1024 / 1024).toFixed(2)} MB with {bits} bits/channel
                </p>
              </div>
            )}

            {/* Encoding type toggle */}
            <div className="flex gap-4 mb-2">
              <button
                type="button"
                className={`px-3 py-1 rounded ${encodeType === "file" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                onClick={() => setEncodeType("file")}
              >
                File
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded ${encodeType === "text" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                onClick={() => setEncodeType("text")}
              >
                Text
              </button>
            </div>

            {/* Data input */}
            {encodeType === "file" ? (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select data file to encode:
                </label>
                <input
                  type="file"
                  accept="*"
                  onChange={(e) => e.target.files && setDataFile(e.target.files[0])}
                  className="w-full"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Accepts any file type (.zst, .bin, .txt, etc.)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter text to encode:
                </label>
                <textarea
                  className="w-full p-2 rounded border border-gray-500 bg-black text-white"
                  rows={5}
                  value={textMessage}
                  onChange={e => setTextMessage(e.target.value)}
                  placeholder="Type your secret message here..."
                />
                <p className="text-sm text-gray-400 mt-1">
                  Your message will be encoded as a UTF-8 text file.
                </p>
              </div>
            )}

            {encodeType === "file" && dataFile && (
              <div className="bg-gray-800/20 p-4 rounded border border-gray-500/30">
                <p className="text-sm">Data file: {dataFile.name}</p>
                <p className="text-sm text-gray-400">Size: {(dataFile.size / 1024 / 1024).toFixed(2)} MB</p>
                {imageFile && dataFile.size > imageCapacity && (
                  <p className="text-sm text-orange-400 mt-2">
                    ⚠️ Data exceeds image capacity. 
                    {autoExpand ? " Canvas will be expanded automatically." : " Please use a larger image or increase bits/channel."}
                  </p>
                )}
              </div>
            )}
            {encodeType === "text" && textMessage && (
              <div className="bg-gray-800/20 p-4 rounded border border-gray-500/30">
                <p className="text-sm">Text length: {textMessage.length} characters</p>
                <p className="text-sm text-gray-400">UTF-8 size: {(new Blob([textMessage]).size / 1024).toFixed(2)} KB</p>
                {imageFile && new Blob([textMessage]).size > imageCapacity && (
                  <p className="text-sm text-orange-400 mt-2">
                    ⚠️ Text exceeds image capacity. 
                    {autoExpand ? " Canvas will be expanded automatically." : " Please use a larger image or increase bits/channel."}
                  </p>
                )}
              </div>
            )}

            {/* Encoding settings */}
            <div className="bg-gray-800/20 p-4 rounded border border-gray-500/30">
              <h3 className="font-medium mb-3">Encoding Settings</h3>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Bits per channel: {bits}
                </label>
                <input
                  type="range"
                  min="1"
                  max={preserveQuality ? 4 : MAX_BITS}
                  value={bits}
                  onChange={(e) => setBits(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {preserveQuality 
                    ? "Limited to 4 bits for better quality preservation"
                    : "Higher values store more data but may be more noticeable"}
                </p>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="preserveQuality"
                  checked={preserveQuality}
                  onChange={(e) => {
                    setPreserveQuality(e.target.checked);
                    if (e.target.checked && bits > 4) {
                      setBits(4);
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="preserveQuality" className="text-sm">
                  Preserve visual quality (recommended)
                </label>
              </div>

              {!imageFile && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoExpand"
                    checked={autoExpand}
                    onChange={(e) => setAutoExpand(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="autoExpand" className="text-sm">
                    Auto-expand canvas to fit data
                  </label>
                </div>
              )}
            </div>

            {(encodeType === "file" ? dataFile : textMessage) && (
              <button
                onClick={async () => {
                  setProcessing(true);
                  let fileToEncode: File | undefined = dataFile;
                  if (encodeType === "text") {
                    fileToEncode = new File([textMessage], "message.txt", { type: "text/plain" });
                  }
                  if (!fileToEncode) return setProcessing(false);
                  const dataURL = URL.createObjectURL(fileToEncode);
                  let imageURL: string | undefined;
                  if (imageFile) {
                    imageURL = URL.createObjectURL(imageFile);
                  }
                  const worker = new Worker(
                    new URL("../workers/stego-worker.ts", import.meta.url),
                    { type: "module" }
                  );
                  workerRef.current = worker;
                  worker.onmessage = ({ data }) => {
                    if (data.pct !== undefined) setPct(data.pct);
                    if (data.done) {
                      const link = URL.createObjectURL(data.png);
                      setDl(link);
                      setPct(1);
                      setProcessing(false);
                    }
                    if (data.error) {
                      alert(data.error);
                      setProcessing(false);
                    }
                  };
                  worker.postMessage({
                    type: "encode",
                    dataURL,
                    imageURL,
                    bits,
                    autoExpand,
                    maxCanvas
                  });
                }}
                disabled={processing}
                className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {processing ? "Processing..." : "Generate Stego PNG"}
              </button>
            )}

            {processing && (
              <>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${pct * 100}%` }}></div>
                </div>
                <p>{(pct * 100).toFixed(1)}%</p>
              </>
            )}
          </div>
        )}

        {/* Decode mode */}
        {mode === "decode" && !dl && (
          <div className="flex flex-col gap-4 w-full">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select PNG file to decode:
              </label>
              <input
                type="file"
                accept="image/png"
                onChange={(e) => e.target.files && handleDecode(e.target.files[0])}
                className="w-full"
              />
            </div>

            {processing && (
              <>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${pct * 100}%` }}></div>
                </div>
                <p>{(pct * 100).toFixed(1)}%</p>
              </>
            )}
          </div>
        )}

        {/* Download link and decoded text */}
        {dl && (
          <div className="text-center">
            <a
              href={dl}
              download="stego.png"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
            >
              Download PNG
            </a>
            <button onClick={clear} className="ml-4 bg-gray-600 text-white px-6 py-3 rounded hover:bg-gray-700">
              Start Over
            </button>
            {decodedText && (
              <div className="mt-8 mx-auto max-w-xl bg-gray-900 text-green-300 p-4 rounded border border-green-600 text-left whitespace-pre-wrap break-words">
                <h3 className="font-bold mb-2 text-green-200">Decoded Text Message:</h3>
                <div style={{ fontFamily: 'monospace' }}>{decodedText}</div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Matrix animation script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          const matrixCanvas = document.getElementById('matrixCanvas');
          const matrixCtx = matrixCanvas.getContext('2d');
          matrixCanvas.width = window.innerWidth;
          matrixCanvas.height = window.innerHeight;
          const fontSize = 16;
          const columns = Math.floor(matrixCanvas.width / fontSize);
          const drops = Array(columns).fill(1);
          const characters = 'アカサタナハマヤラワガザダバパABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
          let frameCounter = 0;
          const updateRate = 4;
          function drawMatrix() {
            if (frameCounter % updateRate !== 0) {
              requestAnimationFrame(drawMatrix);
              frameCounter++;
              return;
            }
            matrixCtx.fillStyle = "rgba(0, 0, 0, 0.05)";
            matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
            matrixCtx.font = \`\${fontSize}px monospace\`;
            for (let i = 0; i < columns; i++) {
              const char = characters[Math.floor(Math.random() * characters.length)];
              const flicker = Math.random() < 0.003;
              if (flicker) {
                matrixCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                matrixCtx.shadowBlur = 4;
                matrixCtx.shadowColor = '#ffffff';
              } else {
                matrixCtx.fillStyle = 'rgba(200, 200, 200, 0.15)';
                matrixCtx.shadowBlur = 0;
              }
              matrixCtx.fillText(char, i * fontSize, drops[i] * fontSize);
              if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.975) {
                drops[i] = 0;
              }
              drops[i]++;
            }
            frameCounter++;
            requestAnimationFrame(drawMatrix);
          }
          drawMatrix();
          window.addEventListener('resize', () => {
            matrixCanvas.width = window.innerWidth;
            matrixCanvas.height = window.innerHeight;
          });
        `
      }} />
    </>
  );
}