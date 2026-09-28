/* =========================================================
   SHARED MAGIC PARTICLES - GRIMOIRE ARZ
   Canvas Background Ambient Particles
   ========================================================= */

(function initParticles() {
  const canvas = document.getElementById('magicParticles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.8 + 1;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = -Math.random() * 0.6 - 0.2; // Bergerak melayang ke atas perlahan
      this.opacity = Math.random() * 0.7 + 0.2;
      this.fadeSpeed = (Math.random() * 0.01) + 0.003;
      this.color = Math.random() > 0.4 ? '#f5d77f' : '#88e09f'; // Emas atau hijau lumut bercahaya
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.opacity += this.fadeSpeed;

      if (this.opacity > 0.85 || this.opacity < 0.15) {
        this.fadeSpeed = -this.fadeSpeed;
      }

      if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
        this.reset();
        this.y = canvas.height + 10;
      }
    }

    draw() {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = Math.max(0, this.opacity);
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < 45; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
})();
