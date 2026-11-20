// Input-only route shared by the simulation and browser tests.
function controller(game) {
  const s = game.state, p = s.player, b = s.boss, c = p.x + p.w / 2;
  const input = { right: true, jumpHeld: true };
  const grounds = s.world.platforms.filter(pl => pl.type === 'ground');
  const arena = grounds.find(pl => b.originX >= pl.x && b.originX <= pl.x + pl.w) || grounds.at(-1);
  if (b.signoffs && b.alive && b.active) {
    const target = b.signoffs[b.maxHealth - b.health];
    const diff = target.x - c;
    input.right = diff >= 0; input.left = diff < 0;
    if (Math.abs(diff) < 78 && p.dashCooldown === 0) input.dashPressed = true;
    return input;
  }
  if (b.alive && b.active && p.x > arena.x + 50) {
    const diff = b.x + b.w / 2 - c;
    input.right = diff > 12; input.left = diff < -12;
    if (!s.assist && b.phase !== 'vulnerable') {
      // Read the telegraph, leave room for the attack, then re-enter on the opening.
      const safeX = Math.max(arena.x + 85, b.x - (b.phase === 'attack' ? 250 : 150));
      input.right = safeX - c > 12; input.left = safeX - c < -12;
      const nearbyShot = s.projectiles.some(shot => Math.abs(shot.x - c) < 130 && Math.abs(shot.y - (p.y + p.h / 2)) < 95);
      if (p.grounded && (nearbyShot || (b.type === 'scopecreep' && b.phase === 'attack' && Math.abs(diff) < 240))) input.jumpPressed = true;
      return input;
    }
    if (b.phase === 'vulnerable' && p.grounded && Math.abs(diff) < 160 && p.dashCooldown <= 0) input.dashPressed = true;
    if (b.phase === 'vulnerable' && !p.grounded && p.vy > 0 && Math.abs(diff) < 160 && p.dashCooldown <= 0) input.dashPressed = true;
    return input;
  }
  // Keyword gates: fetch each key in turn before heading for the gate.
  const key = s.world.collectibles.find(item => item.kind === 'key' && !item.collected);
  if (key && c > key.x - 260) {
    const distance = key.x - c;
    input.right = distance > 5; input.left = distance < -5;
    const needsHeight = p.jumps === 1 && p.vy > -1 && key.y < p.y + 30;
    if ((p.grounded && Math.abs(distance) < 70 && key.y < p.y) || (needsHeight && Math.abs(distance) < 90)) input.jumpPressed = true;
    return input;
  }
  const platform = s.world.platforms.find(pl => pl.id === p.groundId);
  const groundAhead = s.world.platforms.find(pl => pl.type === 'ground' && c + 90 >= pl.x && c + 90 <= pl.x + pl.w);
  const upcomingEnemy = s.enemies.some(e => e.alive && e.type !== 'plane' && e.x - c < 130 && e.x - c > -20 && Math.abs(e.y + e.h - (p.y + p.h)) < 45);
  if (p.grounded && ((platform && platform.x + platform.w - (p.x + p.w) < 78) || !groundAhead || upcomingEnemy)) input.jumpPressed = true;
  const below = s.world.platforms.find(pl => pl.type === 'ground' && c > pl.x && c < pl.x + pl.w);
  if (!p.grounded && p.jumps === 1 && p.vy > 1 && !below) input.jumpPressed = true;
  return input;
}

if (typeof module !== 'undefined') module.exports = controller;
