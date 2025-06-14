const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const fontSize = 16;
const columns = Math.floor(canvas.width / fontSize);
const drops = Array(columns).fill(1);

// Matte grayscale character pool: Japanese + alphanumeric
const characters = 'アカサタナハマヤラワガザダバパABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

let frameCounter = 0;
const updateRate = 4; // slower update rate for terminal drip

function draw() {
  // Skip frames for slowdown
  if (frameCounter % updateRate !== 0) {
    requestAnimationFrame(draw);
    frameCounter++;
    return;
  }

  // Matte trail fade
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = `${fontSize}px monospace`;

  for (let i = 0; i < columns; i++) {
    const char = characters[Math.floor(Math.random() * characters.length)];
    const flicker = Math.random() < 0.003;

    // Soft white flickers, matte grayscale base
    if (flicker) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // soft white pulse
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.15)'; // low-glow matte gray
      ctx.shadowBlur = 0;
    }

    ctx.fillText(char, i * fontSize, drops[i] * fontSize);

    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }

  frameCounter++;
  requestAnimationFrame(draw);
}

draw();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});