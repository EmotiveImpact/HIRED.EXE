(function (root) {
  'use strict';
  const H = root.Hired = root.Hired || {};
  const W = 960, HGT = 540;
  const ink = '#201b4d';
  const BACKGROUNDS = ['application-alley', 'ship-it-city', 'growth-run', 'interview-hq'];
  const THEMES = [
    { top: 'grass', body: 'brick', extra: 'vine', platform: 'grass_platform', accent: '#ffe681', base: '#804471' },
    { top: 'hazard', body: 'brick_metal', extra: 'vent', platform: 'metal_platform', accent: '#ffd56b', base: '#51567f' },
    { top: 'neon', body: 'tech', extra: 'window', platform: 'neon_platform', accent: '#69edff', base: '#392564' },
    { top: 'stone_gold', body: 'stone', extra: 'stone_ivy', platform: 'stone_platform', accent: '#ffe9a2', base: '#817aa6' }
  ];
  const COLOURS = { cyan: '#6af4ff', gold: '#ffda5e', purple: '#bb8cff', pink: '#ff83b4', dust: '#fff1d0' };
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const round = Math.round;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      canvas.width = W; canvas.height = HGT;
      this.ctx.imageSmoothingEnabled = false;
      this.images = {};
      this.meta = root.HIRED_ASSET_META || {};
      this.ready = false;
      this.failed = [];
      this.time = 0;
      this.camera = 0;
      this.levelIndex = 0;
      this.lastAnimation = 'idle';
      this.animationStarted = 0;
    }

    async load() {
      this.meta = root.HIRED_ASSET_META || {};
      const specs = {
        hero: this.meta.hero?.image || 'assets/production/characters/hero-atlas.png',
        enemies: this.meta.enemies?.image || 'assets/production/enemies/enemy-atlas.png',
        terrain: this.meta.terrain?.image || 'assets/production/environment/terrain-atlas.png',
        props: this.meta.props?.image || 'assets/production/environment/props-atlas.png'
      };
      BACKGROUNDS.forEach((name, i) => { specs['background' + i] = 'assets/production/backgrounds/' + name + '.webp'; });
      const results = await Promise.allSettled(Object.entries(specs).map(([key, path]) => new Promise((resolve, reject) => {
        const im = new root.Image();
        im.onload = () => {
          if (!im.naturalWidth) { reject(new Error(path)); return; }
          this.images[key] = im; resolve(key);
        };
        im.onerror = () => reject(new Error(path));
        im.src = root.HIRED_EMBEDDED_ASSETS?.[path] || path;
      })));
      this.failed = results.flatMap((r, i) => r.status === 'rejected' ? [Object.entries(specs)[i][1]] : []);
      for (const key of ['hero', 'enemies', 'terrain', 'props']) {
        if (!this.meta[key]?.frames) this.failed.push(key + ' frame metadata');
      }
      const report = { loaded: Object.keys(this.images), failed: [...this.failed] };
      if (this.failed.length) {
        const error = new Error('Could not load game artwork: ' + this.failed.join(', '));
        error.assetReport = report;
        throw error;
      }
      this.ready = true;
      return report;
    }

    draw(state, realTimeSeconds = 0) {
      const ctx = this.ctx;
      this.time = Number(realTimeSeconds) || 0;
      this.camera = state?.camera?.x || 0;
      this.levelIndex = state?.levelIndex || 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, HGT);
      this.background();
      if (!state) return;
      this.ambient();
      ctx.save();
      ctx.translate(-round(this.camera), 0);
      this.decor(state.world, false);
      for (const p of state.world.platforms) {
        if (!this.visible(p.x, p.w)) continue;
        if (p.type === 'ground') this.ground(p);
      }
      this.decor(state.world, true);
      for (const p of state.world.platforms) {
        if (!this.visible(p.x, p.w) || p.type === 'ground') continue;
        this.platform(p);
      }
      for (const b of state.world.boosts) if (this.visible(b.x, b.w)) this.boost(b);
      for (const s of state.world.springs) if (this.visible(s.x, s.w)) this.spring(s, state);
      for (const cp of state.world.checkpoints) if (this.visible(cp.x - 40, 120)) this.checkpoint(cp);
      this.exit(state);
      for (const item of state.world.collectibles) {
        if (!item.collected && this.visible(item.x - 24, 48)) this.collectible(item, state);
      }
      for (const enemy of state.enemies) if (enemy.alive && this.visible(enemy.x, enemy.w)) this.enemy(enemy);
      this.signoffs(state);
      this.boss(state);
      for (const shot of state.projectiles) this.projectile(shot);
      this.player(state.player, state);
      for (const p of state.particles) this.particle(p);
      ctx.restore();
      // A quiet lower-edge vignette reinforces depth without covering the playfield.
      const shade = ctx.createLinearGradient(0, 512, 0, HGT);
      shade.addColorStop(0, 'rgba(19,15,48,0)'); shade.addColorStop(1, 'rgba(19,15,48,.12)');
      ctx.fillStyle = shade; ctx.fillRect(0, 512, W, 28);
    }

    visible(x, width = 0) { return x + width > this.camera - 220 && x < this.camera + W + 220; }

    background() {
      const ctx = this.ctx, im = this.images['background' + this.levelIndex];
      if (!im) {
        ctx.fillStyle = ['#88c7ff', '#e5abc4', '#7773dc', '#a3ceec'][this.levelIndex];
        ctx.fillRect(0, 0, W, HGT); return;
      }
      // One painted plate drifts slowly behind the physical world. Alternating
      // mirrored copies share an edge without pretending it is a layered source.
      const width = Math.ceil(HGT * im.width / im.height);
      const offset = this.camera * 0.12;
      const first = Math.floor(offset / width);
      for (let i = first; i <= first + 2; i++) {
        const x = round(i * width - offset);
        ctx.save();
        if (i % 2) { ctx.translate(x + width, 0); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, width, HGT); }
        else ctx.drawImage(im, x, 0, width, HGT);
        ctx.restore();
      }
      // Push the painted city slightly into the distance. Collision art stays crisp.
      ctx.fillStyle = this.levelIndex === 2 ? 'rgba(28,26,84,.08)' : 'rgba(230,239,255,.09)';
      ctx.fillRect(0, 0, W, HGT);
    }

    ambient() {
      const ctx = this.ctx, t = this.time;
      ctx.save();
      for (let i = 0; i < 16; i++) {
        const x = ((i * 173 + t * (3 + i % 3) - this.camera * .21) % 1060 + 1060) % 1060 - 50;
        const y = 120 + (i * 67) % 290 + Math.sin(t * .6 + i * 2) * 12;
        ctx.globalAlpha = .18 + .2 * (1 + Math.sin(t * 1.2 + i)) / 2;
        ctx.fillStyle = this.levelIndex === 2 ? '#93f6ff' : '#fff8d8';
        ctx.fillRect(round(x), round(y), i % 3 ? 2 : 3, i % 3 ? 2 : 3);
      }
      ctx.restore();
    }

    frame(group, name) { return this.meta[group]?.frames?.[name]; }

    sprite(group, name, centreX, feet, height, flip = false, opacity = 1) {
      const f = this.frame(group, name), im = this.images[group];
      if (!f || !im) return false;
      const ctx = this.ctx, width = height * f.w / f.h;
      ctx.save();
      ctx.globalAlpha *= opacity;
      ctx.translate(round(centreX), round(feet));
      if (flip) ctx.scale(-1, 1);
      ctx.drawImage(im, f.x, f.y, f.w, f.h, round(-width / 2), -round(height), round(width), round(height));
      ctx.restore();
      return true;
    }

    tile(name, x, y, size = 96) {
      const f = this.frame('terrain', name), im = this.images.terrain;
      if (f && im) this.ctx.drawImage(im, f.x, f.y, f.w, f.h, round(x), round(y), size, size);
    }

    ground(p) {
      const ctx = this.ctx, theme = THEMES[this.levelIndex];
      const top = p.y - (this.levelIndex === 0 ? 6 : this.levelIndex === 3 ? 9 : 3);
      ctx.save();
      ctx.beginPath(); ctx.rect(round(p.x), round(top), round(p.w), p.h + 12); ctx.clip();
      ctx.fillStyle = theme.base; ctx.fillRect(p.x, p.y, p.w, p.h);
      const start = Math.max(0, Math.floor((this.camera - p.x - 96) / 96));
      const last = Math.min(Math.ceil(p.w / 96), Math.ceil((this.camera + W - p.x + 96) / 96));
      for (let col = start; col < last; col++) {
        const x = p.x + col * 96;
        this.tile(theme.top, x, top);
        for (let row = 1; top + row * 96 < Math.min(HGT + 96, p.y + p.h); row++) {
          const chooseExtra = (col + Math.floor(p.x / 96) + row * 3) % 5 === 1;
          this.tile(chooseExtra ? theme.extra : theme.body, x, top + row * 96);
        }
      }
      // Fine face-edge shade reads as the side of a ledge, never a false platform.
      ctx.fillStyle = 'rgba(29,22,57,.24)'; ctx.fillRect(p.x + p.w - 4, p.y + 18, 4, p.h);
      ctx.restore();
    }

    platform(p) {
      const ctx = this.ctx, theme = THEMES[this.levelIndex];
      const name = p.type === 'moving' && this.levelIndex !== 2 ? 'metal_platform' : theme.platform;
      const f = this.frame('props', name), im = this.images.props;
      if (p.type === 'moving') {
        ctx.save();
        ctx.strokeStyle = 'rgba(236,246,255,.40)'; ctx.lineWidth = 2; ctx.setLineDash([4, 7]);
        ctx.beginPath();
        ctx.moveTo(p.baseX + p.w / 2 - p.rangeX, p.baseY + 22 - p.rangeY);
        ctx.lineTo(p.baseX + p.w / 2 + p.rangeX, p.baseY + 22 + p.rangeY);
        ctx.stroke(); ctx.restore();
      }
      if (f && im) {
        const h = this.levelIndex === 0 && p.type !== 'moving' ? 40 : 30;
        ctx.drawImage(im, f.x, f.y, f.w, f.h, round(p.x), round(p.y - 5), round(p.w), h);
      } else {
        ctx.fillStyle = ink; ctx.fillRect(p.x, p.y, p.w, 22);
        ctx.fillStyle = theme.accent; ctx.fillRect(p.x, p.y, p.w, 4);
      }
      if (p.type === 'moving') {
        ctx.fillStyle = 'rgba(113,242,255,.55)';
        ctx.fillRect(round(p.x + 13), round(p.y + 25), 16, 3);
        ctx.fillRect(round(p.x + p.w - 29), round(p.y + 25), 16, 3);
      }
    }

    decor(world, front) {
      const ctx = this.ctx;
      for (const d of world.decor) {
        if (!this.visible(d.x, 240)) continue;
        if (d.type === 'arch') {
          if (front) {
            ctx.save(); ctx.beginPath(); ctx.rect(d.x, d.y + 14, 150, 160); ctx.clip();
            this.sprite('props', 'arch', d.x + 72, d.y + 136, 126);
            ctx.restore();
          }
          continue;
        }
        if (front) continue;
        if (d.type === 'sign') { this.sign(d); continue; }
        // World terminals are supplied by checkpoint actors, avoiding two screens
        // occupying the same save point.
        if (d.type === 'terminal') continue;
        const mapped = d.type === 'crane' ? 'satellite' : d.type;
        const height = ({ cafe: 188, tree: this.levelIndex === 3 ? 140 : 166, pink_tree: 164,
          banner: 124, crate: 48, satellite: 100, lamp: 120 })[mapped] || 82;
        const name = mapped === 'tree' && this.levelIndex === 3 ? 'pink_tree' : mapped;
        const f = this.frame('props', name);
        if (!f) continue;
        const width = height * f.w / f.h;
        this.sprite('props', name, d.x + width / 2, d.y + 3, height, false, mapped === 'crate' ? .9 : 1);
      }
      if (!front) {
        // Sparse repeated street furniture gives the same generated components a
        // consistent scale across the four distinct level layouts.
        for (let i = 0; i < world.platforms.length; i++) {
          const p = world.platforms[i];
          if (p.type !== 'ground' || p.w < 420) continue;
          const x = p.x + p.w - 82;
          if (!this.visible(x, 80) || x > world.boss.x - 160) continue;
          const prop = this.levelIndex === 2 ? 'pink_tree' : 'lamp';
          this.sprite('props', prop, x, p.y + 2, prop === 'lamp' ? 103 : 98, false, .88);
        }
      }
    }

    sign(d) {
      const ctx = this.ctx;
      const long = d.text.length > 25, width = long ? 180 : 174, height = long ? 58 : 65;
      const x = round(d.x), y = round(d.y - height - 24);
      ctx.fillStyle = '#3a325e'; ctx.fillRect(x + 12, y + height, 6, 25); ctx.fillRect(x + width - 18, y + height, 6, 25);
      ctx.fillStyle = '#b4a4d7'; ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
      ctx.fillStyle = '#241e58'; ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#7066ba'; ctx.fillRect(x, y, width, 4);
      ctx.fillStyle = '#ffdc83'; ctx.fillRect(x + 8, y + 10, 4, 4); ctx.fillRect(x + width - 12, y + 10, 4, 4);
      const lines = this.wrap(d.text, width - 22, long ? 10 : 13);
      const lineH = long ? 12 : 15;
      ctx.fillStyle = '#faf6ff'; ctx.font = 'bold ' + (long ? 10 : 13) + 'px monospace'; ctx.textAlign = 'center';
      lines.forEach((line, i) => ctx.fillText(line, x + width / 2, y + (height - lines.length * lineH) / 2 + 13 + i * lineH));
      ctx.textAlign = 'left';
    }

    wrap(text, maxWidth, size) {
      const ctx = this.ctx; ctx.font = 'bold ' + size + 'px monospace';
      const lines = []; let line = '';
      for (const word of text.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines;
    }

    boost(b) {
      const ctx = this.ctx;
      ctx.fillStyle = '#1b3a64'; ctx.fillRect(b.x, b.y - 4, b.w, 7);
      ctx.fillStyle = '#72f6ff'; ctx.fillRect(b.x, b.y - 5, b.w, 2);
      ctx.save(); ctx.beginPath(); ctx.rect(b.x, b.y - 4, b.w, 7); ctx.clip();
      const offset = (this.time * 36) % 32;
      for (let x = b.x - 32 + offset; x < b.x + b.w; x += 32) {
        ctx.fillStyle = '#d9feff';
        ctx.fillRect(round(x), b.y - 3, 9, 2); ctx.fillRect(round(x + 7), b.y - 1, 7, 2);
      }
      ctx.restore();
    }

    spring(s, state) {
      const ctx = this.ctx;
      const compressed = state.player.springCooldown > 15 && Math.abs(state.player.x - s.x) < 80;
      const height = compressed ? 9 : 18, y = s.y - height;
      ctx.fillStyle = ink; ctx.fillRect(s.x - 2, y - 3, s.w + 4, 8);
      ctx.fillStyle = '#ffda5e'; ctx.fillRect(s.x, y - 2, s.w, 5);
      ctx.fillStyle = '#fff6b2'; ctx.fillRect(s.x + 2, y - 2, s.w - 4, 2);
      ctx.strokeStyle = '#b8b9ef'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(s.x + 9, y + 6); ctx.lineTo(s.x + s.w - 9, y + 10);
      ctx.lineTo(s.x + 10, y + 14); ctx.lineTo(s.x + s.w - 10, s.y);
      ctx.stroke();
      ctx.fillStyle = '#473666'; ctx.fillRect(s.x + 3, s.y - 2, s.w - 6, 4);
    }

    checkpoint(cp) {
      const ctx = this.ctx, x = cp.x + 16, feet = cp.y;
      if (cp.active) {
        ctx.fillStyle = 'rgba(77,253,231,.13)'; ctx.fillRect(x - 28, feet - 68, 56, 68);
        ctx.strokeStyle = '#76ffe6'; ctx.lineWidth = 2; ctx.strokeRect(x - 29, feet - 69, 58, 69);
      }
      this.sprite('props', 'terminal', x, feet + 1, 57);
      this.label(cp.active ? 'SAVED' : 'CHECKPOINT', x, feet - 81, cp.active ? '#b8fff0' : '#fff5c7', 10);
      if (cp.active) {
        ctx.strokeStyle = '#baff9f'; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(x + 18, feet - 67); ctx.lineTo(x + 22, feet - 63); ctx.lineTo(x + 30, feet - 73); ctx.stroke();
      }
    }

    collectible(item, state) {
      if (item.secret) {
        const close = Math.abs(state.player.x - item.x) < 185 && state.player.y < item.y + 115;
        if (!close) {
          this.sprite('enemies','briefcase',item.x,item.y + 10,19,false,.72);
          return;
        }
      }
      const ctx = this.ctx, bob = Math.sin(this.time * 4 + item.x * .017) * 4;
      const skill = item.kind === 'skill';
      const pick = skill ? ['palette', 'bricks', 'code', 'cube'][this.levelIndex] : 'bulb';
      const height = skill ? 40 : 26, cy = item.y + bob;
      if (skill) {
        ctx.save(); ctx.strokeStyle = '#fff4b7'; ctx.lineWidth = 2; ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.arc(item.x, cy, 27 + Math.sin(this.time * 3) * 2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        const pulse = Math.sin(this.time * 4);
        ctx.fillStyle = '#fff2b3'; ctx.fillRect(item.x - 2, cy - 35 - pulse * 2, 4, 4);
      }
      ctx.save();
      ctx.translate(round(item.x), round(cy));
      const squeeze = skill ? 1 : .84 + Math.abs(Math.sin(this.time * 2 + item.x)) * .16;
      ctx.scale(squeeze, 1);
      this.sprite('enemies', pick, 0, height / 2, height);
      ctx.restore();
      if (skill && Math.abs(state.player.x - item.x) < 115 && Math.abs(state.player.y - item.y) < 160) {
        this.label(item.skill.title, item.x, cy - 43, '#fff4d2', 11);
      }
    }

    enemy(e) {
      const animation = e.type === 'inbox' ? 'envelope' : e.type;
      const frame = animation + '_' + Math.floor((e.phase || 0) / (animation === 'plane' ? 14 : 8)) % 2;
      const height = e.type === 'plane' ? 36 : e.h + 9;
      this.sprite('enemies', frame, e.x + e.w / 2, e.y + e.h + 1, height, e.type === 'plane' && e.facing < 0);
    }

    signoffs(state) {
      if (!state.world.signoffs) return;
      const cleared = state.boss.maxHealth - state.boss.health;
      for (const [i, terminal] of state.world.signoffs.entries()) {
        if (!this.visible(terminal.x - 55, 110)) continue;
        const floor = state.boss.floor;
        this.sprite('props', 'terminal', terminal.x, floor, 68, false, i > cleared ? .55 : 1);
        const prompt = i < cleared ? 'FILED' : i === cleared ? 'DASH' : 'WAIT';
        this.label(terminal.label + ' · ' + prompt, terminal.x, floor - 82,
          i === cleared ? '#ffe070' : '#d4f5e3', 11);
      }
    }

    boss(state) {
      const b = state.boss;
      if (!b || !this.visible(b.x - 80, b.w + 160)) return;
      if (b.type === 'finalreview') {
        this.sprite('enemies', b.type, b.x + b.w / 2, b.floor, 90);
        this.label(b.alive ? 'RECEPTION' : 'THE ROOM IS YOURS', b.x + b.w / 2, b.floor - 105, '#ffe8ae', 12);
        return;
      }
      if (!b.alive) return;
      const ctx = this.ctx, cx = b.x + b.w / 2, feet = b.y + b.h;
      const visualHeight = b.h + 24;
      const open = b.phase === 'vulnerable';
      const warning = b.phase === 'telegraph';
      if (b.active && !open && b.type !== 'scopecreep') {
        ctx.save();
        ctx.strokeStyle = warning ? '#ffd46f' : 'rgba(157,201,255,.7)'; ctx.lineWidth = warning ? 3 : 2;
        ctx.setLineDash(warning ? [6, 4] : [3, 7]); ctx.lineDashOffset = -this.time * 22;
        ctx.beginPath(); ctx.ellipse(cx, feet - visualHeight / 2, b.w / 2 + 14, visualHeight / 2 + 11, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      const hitFlash = b.hitCooldown > 0 && Math.floor(b.hitCooldown / 4) % 2;
      if (!hitFlash) this.sprite('enemies', b.type, cx, feet, visualHeight);
      if (b.active) {
        const y = feet - visualHeight - 34;
        this.label(b.name.toUpperCase(), cx, y - 15, '#fff9e9', 10);
        ctx.fillStyle = '#20183f'; ctx.fillRect(cx - 49, y, 98, 9);
        ctx.fillStyle = '#b8a1ed'; ctx.fillRect(cx - 47, y + 2, 94, 5);
        ctx.fillStyle = open ? '#8af2bc' : '#ffb15d';
        ctx.fillRect(cx - 47, y + 2, round(94 * b.health / b.maxHealth), 5);
        for (let i = 1; i < b.maxHealth; i++) { ctx.fillStyle = ink; ctx.fillRect(cx - 48 + i * 96 / b.maxHealth, y + 1, 2, 7); }
        if (warning) {
          const wx = cx + b.facing * (b.w / 2 + 36), wy = feet - 60;
          ctx.fillStyle = '#ffdc73'; ctx.beginPath(); ctx.moveTo(wx, wy - 22); ctx.lineTo(wx - 18, wy + 10); ctx.lineTo(wx + 18, wy + 10); ctx.closePath(); ctx.fill();
          ctx.fillStyle = ink; ctx.font = 'bold 25px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', wx, wy + 6); ctx.textAlign = 'left';
        } else if (b.type === 'scopecreep') {
          this.label(b.phase === 'attack' ? 'CHARGE!' : 'FILE THE LIT BRIEF', cx, feet + 23, '#ffdf9a', 10);
        } else if (open) {
          this.label('OPEN · STOMP OR DASH', cx, feet + 23, '#b4ffcb', 10);
          const bounce = Math.sin(this.time * 8) * 3;
          ctx.fillStyle = '#b8ffd2'; ctx.beginPath();
          ctx.moveTo(cx - 7, feet - visualHeight - 10 + bounce);
          ctx.lineTo(cx + 7, feet - visualHeight - 10 + bounce);
          ctx.lineTo(cx, feet - visualHeight - 3 + bounce); ctx.closePath(); ctx.fill();
        } else if (b.phase === 'attack') {
          this.label(b.type === 'algorithm' ? 'DODGE THE FAN' : 'DODGE THE SCAN', cx, feet + 23, '#ffdb92', 10);
        } else {
          this.label('SHIELD UP', cx, feet + 23, '#d2e7ff', 9);
        }
      }
    }

    projectile(shot) {
      if (!this.visible(shot.x, 20)) return;
      const ctx = this.ctx, col = shot.kind === 'purple' ? '#d7a0ff' : '#83f7ff';
      ctx.fillStyle = 'rgba(132,218,255,.22)'; ctx.fillRect(round(shot.x - 4), round(shot.y - 4), 22, 22);
      ctx.fillStyle = '#423171'; ctx.fillRect(round(shot.x - 1), round(shot.y - 1), 16, 16);
      ctx.fillStyle = col; ctx.fillRect(round(shot.x + 2), round(shot.y + 2), 10, 10);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(round(shot.x + 4), round(shot.y + 4), 4, 4);
    }

    player(p, state) {
      const ctx = this.ctx, im = this.images.hero, animations = this.meta.hero?.animations;
      if (!im || !animations) return;
      const name = state.mode === 'complete' ? 'victory' : p.animation || 'idle';
      if (name !== this.lastAnimation) { this.lastAnimation = name; this.animationStarted = this.time; }
      const anim = animations[name] || animations.idle;
      const elapsed = Math.max(0, this.time - this.animationStarted);
      let index = Math.floor(elapsed * (anim.fps || 8));
      index = anim.loop ? index % anim.frames.length : Math.min(index, anim.frames.length - 1);
      const f = this.frame('hero', anim.frames[index]);
      if (!f) return;
      const x = round(p.x + p.w / 2), feet = round(p.y + p.h);
      const draw = (atX, opacity) => {
        ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(atX, feet);
        if (p.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(im, f.x, f.y, f.w, f.h, -f.anchor[0], -f.anchor[1], f.w, f.h);
        ctx.restore();
      };
      if (p.dashTime > 0) { draw(x - p.facing * 34, .13); draw(x - p.facing * 17, .28); }
      const blink = p.invulnerable > 0 && Math.floor(state.tick / 5) % 2;
      draw(x, blink ? .45 : 1);
      if (state.assist && p.grounded) {
        ctx.fillStyle = '#a6fff1'; ctx.fillRect(x - 11, feet + 1, 22, 2);
      }
    }

    exit(state) {
      const ex = state.world.exit;
      if (!this.visible(ex.x - 20, ex.w + 40)) return;
      const ctx = this.ctx, cx = ex.x + ex.w / 2, feet = ex.y + ex.h;
      const unlocked = !state.boss.alive;
      if (unlocked) {
        ctx.fillStyle = 'rgba(110,250,255,.12)'; ctx.fillRect(cx - 45, feet - 114, 90, 115);
      }
      this.sprite('props', 'portal', cx, feet + 2, 116);
      this.label(unlocked ? (state.levelIndex === 3 ? 'FINISH THE STORY' : 'NEXT WORLD') : 'CLEAR THE REVIEW', cx, feet - 133, unlocked ? '#b6fff0' : '#efe0ff', 10);
      if (!unlocked) {
        ctx.fillStyle = '#32235f'; ctx.fillRect(cx - 18, feet - 64, 36, 27);
        ctx.strokeStyle = '#ffe09c'; ctx.lineWidth = 3; ctx.strokeRect(cx - 9, feet - 73, 18, 17);
        ctx.fillStyle = '#ffd36c'; ctx.fillRect(cx - 13, feet - 63, 26, 20);
        ctx.fillStyle = ink; ctx.fillRect(cx - 2, feet - 57, 4, 8);
      } else {
        for (let i = 0; i < 5; i++) {
          const a = this.time * 1.8 + i * Math.PI * .4;
          ctx.fillStyle = i % 2 ? '#ffdc8c' : '#c0ffff';
          ctx.fillRect(round(cx + Math.cos(a) * 52), round(feet - 58 + Math.sin(a) * 62), 3, 3);
        }
      }
    }

    label(text, x, y, colour = '#ffffff', size = 11) {
      const ctx = this.ctx;
      ctx.save(); ctx.font = 'bold ' + size + 'px monospace'; ctx.textAlign = 'center';
      const width = ctx.measureText(text).width + 14;
      ctx.fillStyle = 'rgba(31,25,68,.88)'; ctx.fillRect(round(x - width / 2), round(y - size - 3), round(width), size + 10);
      ctx.fillStyle = colour; ctx.fillText(text, round(x), round(y + 1)); ctx.restore();
    }

    particle(p) {
      if (!this.visible(p.x, 8)) return;
      const ctx = this.ctx;
      ctx.save(); ctx.globalAlpha = clamp(p.life / Math.min(14, p.maxLife), 0, 1);
      ctx.fillStyle = p.kind === 'confetti' ? ['#ffed8e', '#ff98ca', '#8cf7ed', '#bba0ff'][Math.abs(round(p.x + p.y)) % 4] : COLOURS[p.kind] || '#fff4d4';
      ctx.fillRect(round(p.x), round(p.y), p.size, p.kind === 'confetti' ? p.size / 2 + 1 : p.size);
      ctx.restore();
    }
  }

  H.Renderer = Renderer;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Renderer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

