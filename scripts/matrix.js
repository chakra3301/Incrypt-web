const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

let fontSize = 16;
let columns;
let drops;
let frameCounter = 0;
const updateRate = 4;

const characters = 'アカサタナハマヤラワガザダバパABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

// Function to resize canvas and reset drops
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  columns = Math.floor(canvas.width / fontSize);
  drops = Array(columns).fill(1);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function draw() {
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

    if (flicker) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ffffff';
    } else {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.15)';
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