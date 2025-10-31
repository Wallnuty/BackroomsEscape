import * as THREE from "three";

export class Chalkboard {
  constructor(initialPhrase = "KNOWLEDGE IS POWER", scale = 1) {
    this.phrase = initialPhrase;
    this.group = new THREE.Group();

    // --- Canvas for writing text ---
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    this._drawText(ctx, initialPhrase);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // --- Materials (dark, abandoned classroom) ---
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d,
      roughness: 0.95,
      metalness: 0.0,
      emissive: 0x050505,
    });

    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    // --- Geometry ---
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 0.1),
      boardMaterial
    );

    const textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 2.8),
      textMaterial
    );
    textPlane.position.z = 0.051;

    this.group.add(frame);
    this.group.add(textPlane);
    this.group.scale.set(scale, scale, scale);

    // --- Store for updates ---
    this.canvas = canvas;
    this.ctx = ctx;
    this.textMaterial = textMaterial;
    this._cycleInterval = null;
    this.flickerInterval = null;

    // Start eerie flicker effect
    this._startFlicker();
  }

  _drawText(ctx, phrase) {
    // Dark, grimy background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Add scratches and worn marks (like children scratched the board)
    ctx.strokeStyle = "rgba(25, 25, 25, 0.4)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(
        Math.random() * ctx.canvas.width,
        Math.random() * ctx.canvas.height
      );
      ctx.lineTo(
        Math.random() * ctx.canvas.width,
        Math.random() * ctx.canvas.height
      );
      ctx.stroke();
    }

    // Blood-red stains dripping from top (horror element)
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, "rgba(100, 0, 0, 0.4)");
    gradient.addColorStop(1, "rgba(100, 0, 0, 0)");
    ctx.fillStyle = gradient;

    // Multiple drip marks
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(150 + i * 180, 0, 40, 180);
    }

    // Childlike handprints (creepy small handprints)
    ctx.fillStyle = "rgba(80, 0, 0, 0.3)";
    for (let i = 0; i < 4; i++) {
      const x = 100 + Math.random() * 800;
      const y = 50 + Math.random() * 400;
      this._drawHandprint(ctx, x, y, 0.4);
    }

    // Main text - childlike handwriting but ominous
    ctx.font = "bold 72px 'Comic Sans MS', cursive";
    ctx.fillStyle = "#7a0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Add dark red glow
    ctx.shadowColor = "#8b0000";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw text with slight wobble (like a child wrote it)
    const centerY = ctx.canvas.height / 2;
    const words = phrase.split(" ");
    let currentX = ctx.canvas.width / 2;

    if (words.length === 1) {
      // Single word - add slight rotation for unsettling effect
      ctx.save();
      ctx.translate(currentX, centerY);
      ctx.rotate((Math.random() - 0.5) * 0.05);
      ctx.fillText(phrase, 0, 0);
      ctx.restore();
    } else {
      // Multiple words - stagger them slightly
      ctx.font = "bold 60px 'Comic Sans MS', cursive";
      const totalWidth = ctx.measureText(phrase).width;
      currentX = (ctx.canvas.width - totalWidth) / 2 + 50;

      words.forEach((word, i) => {
        const yOffset = (Math.random() - 0.5) * 10;
        ctx.fillText(word, currentX, centerY + yOffset);
        currentX += ctx.measureText(word + " ").width;
      });
    }

    // Add childish crayon scribbles in corners
    ctx.strokeStyle = "rgba(100, 0, 0, 0.2)";
    ctx.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      const x =
        Math.random() < 0.5 ? Math.random() * 150 : 874 + Math.random() * 150;
      const y =
        Math.random() < 0.5 ? Math.random() * 100 : 412 + Math.random() * 100;
      ctx.arc(x, y, 20 + Math.random() * 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Reset shadow
    ctx.shadowBlur = 0;

    // Add tally marks (like counting days or victims)
    ctx.strokeStyle = "rgba(120, 0, 0, 0.5)";
    ctx.lineWidth = 3;
    const tallyX = 50;
    const tallyY = 100;
    for (let i = 0; i < 12; i++) {
      const xOffset = (i % 5) * 15;
      const group = Math.floor(i / 5);
      if (i % 5 === 4) {
        // Diagonal strike through
        ctx.beginPath();
        ctx.moveTo(tallyX + group * 100, tallyY + 40);
        ctx.lineTo(tallyX + group * 100 + 60, tallyY - 10);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(tallyX + xOffset + group * 100, tallyY);
        ctx.lineTo(tallyX + xOffset + group * 100, tallyY + 40);
        ctx.stroke();
      }
    }
  }

  _drawHandprint(ctx, x, y, scale) {
    // Draw a small child's handprint
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Palm
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();

    // Fingers
    const fingers = [
      { x: -20, y: -25, length: 25 },
      { x: -7, y: -30, length: 30 },
      { x: 7, y: -30, length: 28 },
      { x: 20, y: -25, length: 23 },
    ];

    fingers.forEach((finger) => {
      ctx.beginPath();
      ctx.arc(finger.x, finger.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(finger.x - 6, finger.y, 12, finger.length);
    });

    // Thumb
    ctx.beginPath();
    ctx.arc(-28, 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-35, 10, 20, 15);

    ctx.restore();
  }

  _startFlicker() {
    // Occasional flicker effect for the text (like dying lights)
    this.flickerInterval = setInterval(() => {
      if (Math.random() < 0.15) {
        // 15% chance
        this.textMaterial.opacity = 0.6 + Math.random() * 0.3;
        setTimeout(() => {
          this.textMaterial.opacity = 1.0;
        }, 30 + Math.random() * 70);
      }
    }, 200);
  }

  setPhrase(newPhrase) {
    this.phrase = newPhrase;
    this._drawText(this.ctx, newPhrase);
    this.textMaterial.map.needsUpdate = true;
  }

  // --- Automatic cycling of phrases ---
  startCycling(phrases = ["KNOWLEDGE", "LEARN", "OBSERVE"], interval = 3000) {
    if (!phrases || phrases.length === 0) return;
    let index = 0;
    this.setPhrase(phrases[index]);
    this._cycleInterval = setInterval(() => {
      index = (index + 1) % phrases.length;
      this.setPhrase(phrases[index]);
    }, interval);
  }

  stopCycling() {
    if (this._cycleInterval) {
      clearInterval(this._cycleInterval);
      this._cycleInterval = null;
    }
    if (this.flickerInterval) {
      clearInterval(this.flickerInterval);
      this.flickerInterval = null;
    }
  }
}
