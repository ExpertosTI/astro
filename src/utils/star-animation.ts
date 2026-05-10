"use client";

type Star = { x: number; y: number; r: number; a: number; da: number };

export function initStarAnimation(canvas: HTMLCanvasElement, isMobile: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const stars: Star[] = [];
  let rafId = 0;
  const starCount = isMobile ? 110 : 180;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * (isMobile ? 0.8 : 1.2),
      a: Math.random(),
      da: 0.01 + Math.random() * 0.02
    });
  }

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a += s.da;
      const op = 0.15 + Math.abs(Math.sin(s.a)) * 0.65;
      ctx.fillStyle = `rgba(255, 220, 180, ${op})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  };

  draw();

  return () => {
    window.removeEventListener("resize", resize);
    cancelAnimationFrame(rafId);
  };
}
