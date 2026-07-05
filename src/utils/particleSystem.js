/**
 * particleSystem.js
 * Spawn, update, and draw ambient + laser particles.
 * Pool is capped at PARTICLE_CAP (400) using FIFO culling.
 */

/**
 * Spawn a new particle into engine.particles.
 * @param {object} engine - mutable engine ref (mutated directly)
 * @param {'ambient'|'laser'} type
 */
export function spawnParticle(engine, type) {
  // FIFO cull if over cap
  if (engine.particles.length >= engine.PARTICLE_CAP) {
    engine.particles.shift();
  }

  const hue = 180 + engine.handX * 180; // matches wave/skeleton hue

  if (type === 'laser') {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 8;
    engine.particles.push({
      x:    engine.indexTipX,
      y:    engine.indexTipY,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      life:  1,
      decay: 0.04,
      size:  2 + Math.random() * 3,
      hue:   300,   // pink/violet, independent of hand X per spec
      sat:   100,
      lit:   70,
    });
  } else {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2.5;
    engine.particles.push({
      x:    engine.palmX + (Math.random() - 0.5) * 32,
      y:    engine.palmY + (Math.random() - 0.5) * 32,
      vx:   Math.cos(angle) * speed,
      vy:   Math.sin(angle) * speed,
      life:  1,
      decay: 0.008 + Math.random() * 0.015,
      size:  2 + Math.random() * 3,
      hue,
      sat:   90,
      lit:   65,
    });
  }
}

/**
 * Physics step for all particles. Mutates engine.particles.
 * @param {object} engine
 */
export function updateParticles(engine) {
  for (let i = engine.particles.length - 1; i >= 0; i--) {
    const p = engine.particles[i];
    p.vy  += 0.04;   // gravity
    p.vx  *= 0.98;   // air resistance
    p.x   += p.vx;
    p.y   += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) engine.particles.splice(i, 1);
  }
}

/**
 * Draw all particles onto the canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} engine
 * @param {number} width
 * @param {number} height
 */
export function drawParticles(ctx, engine, width, height) {
  ctx.clearRect(0, 0, width, height);

  for (const p of engine.particles) {
    if (p.life <= 0) continue;
    const size = Math.max(0.5, p.size * p.life);

    ctx.save();
    ctx.globalAlpha = p.life * 0.85;
    ctx.fillStyle   = `hsl(${p.hue}, ${p.sat}%, ${p.lit}%)`;
    ctx.shadowColor = `hsl(${p.hue}, ${p.sat}%, ${p.lit}%)`;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
