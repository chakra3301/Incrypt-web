const bgCanvas = document.getElementById('canvasBackground');
const bgCtx = bgCanvas.getContext('2d');


function resizeCanvasToViewport() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  drawDotMatrix(); // Redraw after resize
}

function drawDotMatrix() {
  const spacing = 15; 
  const radius = 1.5;

  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

  for (let x = 0; x < bgCanvas.width; x += spacing) {
    for (let y = 0; y < bgCanvas.height; y += spacing) {
      const brightness = Math.random() < 0.1 ? 1 : 0.1;
      bgCtx.beginPath();
      bgCtx.arc(x, y, radius, 0, 2 * Math.PI);
      bgCtx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      bgCtx.fill();
    }
  }
}


resizeCanvasToViewport();


window.addEventListener('resize', resizeCanvasToViewport);


setInterval(drawDotMatrix, 2000);