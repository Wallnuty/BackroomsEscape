// KeypadUI.js - Creepy 2D Popup Interface for Keypad Password Entry

export class KeypadUI {
  constructor(correctCode, onSuccess, onFailure, pointerLockControls = null) {
    this.correctCode = correctCode;
    this.onSuccess = onSuccess;
    this.onFailure = onFailure;
    this.enteredCode = "";
    this.isVisible = false;
    this.isSolved = false;

    this.pointerLockControls = pointerLockControls;
    this._createUI();
    this._startGlitchEffect();
  }

  _createUI() {
    // Main container
    this.container = document.createElement("div");
    this.container.id = "keypad-popup";
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 100%);
      border: 3px solid #440000;
      border-radius: 5px;
      padding: 30px;
      z-index: 1000;
      display: none;
      box-shadow: 0 0 50px rgba(139, 0, 0, 0.8), inset 0 0 30px rgba(0, 0, 0, 0.9);
      font-family: 'Courier New', monospace;
      user-select: none;
      filter: contrast(1.2);
    `;

    // Title
    const title = document.createElement("div");
    title.textContent = "E N T E R   C O D E";
    title.className = "glitch-text";
    title.style.cssText = `
      color: #8b0000;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
      letter-spacing: 8px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8),
                   0 0 10px rgba(139, 0, 0, 0.5);
      animation: flicker 3s infinite;
    `;
    this.container.appendChild(title);

    // Display screen
    this.display = document.createElement("div");
    this.display.style.cssText = `
      background: #000000;
      border: 2px solid #440000;
      border-radius: 3px;
      padding: 15px;
      margin-bottom: 20px;
      text-align: center;
      font-size: 32px;
      font-family: 'Courier New', monospace;
      color: #ff0000;
      min-height: 50px;
      letter-spacing: 12px;
      text-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
      box-shadow: inset 0 0 20px rgba(139, 0, 0, 0.3);
      animation: pulse 2s infinite;
    `;
    this.display.textContent = "----";
    this.container.appendChild(this.display);

    // Keypad grid
    const keypadGrid = document.createElement("div");
    keypadGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 15px;
      filter: brightness(0.8);
    `;

    // Number buttons (1-9)
    for (let i = 1; i <= 9; i++) {
      const btn = this._createButton(i.toString());
      keypadGrid.appendChild(btn);
    }

    // Bottom row: Clear, 0, Enter
    const clearBtn = this._createButton("C", "#2a0000");
    const zeroBtn = this._createButton("0");
    const enterBtn = this._createButton("✓", "#1a3a1a");

    keypadGrid.appendChild(clearBtn);
    keypadGrid.appendChild(zeroBtn);
    keypadGrid.appendChild(enterBtn);

    this.container.appendChild(keypadGrid);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ CLOSE";
    closeBtn.style.cssText = `
      width: 100%;
      padding: 12px;
      background: #1a1a1a;
      border: 1px solid #440000;
      border-radius: 3px;
      color: #666;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      font-family: 'Courier New', monospace;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = "#2a0000";
      closeBtn.style.color = "#999";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = "#1a1a1a";
      closeBtn.style.color = "#666";
    };
    closeBtn.onclick = () => this.hide();
    this.container.appendChild(closeBtn);

    // Message display
    this.message = document.createElement("div");
    this.message.style.cssText = `
      margin-top: 15px;
      text-align: center;
      font-size: 14px;
      min-height: 20px;
      font-weight: bold;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    `;
    this.container.appendChild(this.message);

    // Overlay (dark background)
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 999;
      display: none;
      animation: vignette 2s infinite;
    `;
    this.overlay.onclick = () => this.hide();

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.container);
  }

  _createButton(text, color = "#1a0a0a") {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.style.cssText = `
      padding: 20px;
      font-size: 24px;
      font-weight: bold;
      background: ${color};
      border: 2px solid #440000;
      border-radius: 3px;
      color: #8b0000;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.8),
                  inset 0 0 10px rgba(139, 0, 0, 0.2);
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 5px rgba(139, 0, 0, 0.5);
    `;

    btn.onmouseover = () => {
      btn.style.background = "#2a0000";
      btn.style.color = "#ff0000";
      btn.style.boxShadow = "0 0 15px rgba(139, 0, 0, 0.8)";
      btn.style.textShadow = "0 0 10px #ff0000";
    };

    btn.onmouseout = () => {
      btn.style.background = color;
      btn.style.color = "#8b0000";
      btn.style.boxShadow =
        "0 4px 6px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(139, 0, 0, 0.2)";
      btn.style.textShadow = "0 0 5px rgba(139, 0, 0, 0.5)";
    };

    btn.onclick = () => this._handleInput(text);

    return btn;
  }

  _handleInput(value) {
    if (value === "C") {
      // Clear
      this.enteredCode = "";
      this.display.textContent = "----";
      this.message.textContent = "";
      this.message.style.color = "";
    } else if (value === "✓") {
      // Enter/Submit
      this._checkCode();
    } else {
      // Number input - LIMIT TO 4 DIGITS
      if (this.enteredCode.length < 4) {
        this.enteredCode += value;
        // Show digits with dashes for empty slots
        let displayText = "";
        for (let i = 0; i < 4; i++) {
          if (i < this.enteredCode.length) {
            displayText += "█";
          } else {
            displayText += "-";
          }
        }
        this.display.textContent = displayText;
      }
    }
  }

  _checkCode() {
    if (this.enteredCode === this.correctCode) {
      this.message.textContent = "A C C E S S   G R A N T E D";
      this.message.style.color = "#00ff00";
      this.message.style.textShadow = "0 0 10px #00ff00";

      // Mark THIS specific keypad as solved
      if (this.currentKeypadModel) {
        this.currentKeypadModel.userData.isSolved = true;
        console.log(
          "✅ Keypad marked as solved:",
          this.currentKeypadModel.userData.code
        );
        console.log(
          "✅ isSolved flag:",
          this.currentKeypadModel.userData.isSolved
        );
      } else {
        console.error("❌ No currentKeypadModel reference!");
      }

      // Call success callback
      if (this.onSuccess) {
        this.onSuccess();
      }

      // Hide after short delay
      setTimeout(() => this.hide(), 1500);
    } else {
      this.message.textContent = "W R O N G   C O D E";
      this.message.style.color = "#ff0000";
      this.message.style.textShadow = "0 0 10px #ff0000";

      // Call failure callback
      if (this.onFailure) {
        this.onFailure();
      }

      // Intense shake animation
      this.container.style.animation = "creepy-shake 0.6s";
      setTimeout(() => {
        this.container.style.animation = "";
      }, 600);

      // Clear after delay
      setTimeout(() => {
        this.enteredCode = "";
        this.display.textContent = "----";
        this.message.textContent = "";
      }, 2000);
    }
  }

  _startGlitchEffect() {
    setInterval(() => {
      if (this.isVisible && Math.random() > 0.95) {
        this.container.style.filter = "contrast(1.5) brightness(1.2)";
        setTimeout(() => {
          this.container.style.filter = "contrast(1.2)";
        }, 50);
      }
    }, 200);
  }

  show() {
    this.isVisible = true;

    // CRITICAL: Set keypad open flag FIRST, before unlocking pointer
    if (this.controlsWrapper && this.controlsWrapper.setKeypadOpen) {
      this.controlsWrapper.setKeypadOpen(true);
    }

    this.overlay.style.display = "block";
    this.container.style.display = "block";
    this.enteredCode = "";
    this.display.textContent = "----";
    this.message.textContent = "";

    // Exit pointer lock AND disable controls
    if (this.pointerLockControls) {
      console.log("📱 Unlocking pointer and disabling controls");

      // Disable the controls first
      this.pointerLockControls.enabled = false;

      // Unlock the pointer
      this.pointerLockControls.unlock();
      document.exitPointerLock();
    }

    // Show cursor
    document.body.style.cursor = "default";

    // Force hide pause menu if it appeared
    setTimeout(() => {
      const pauseMenu = document.getElementById("pauseMenu");
      if (pauseMenu) {
        pauseMenu.style.display = "none";
      }
    }, 10);
  }

  hide() {
    this.isVisible = false;
    this.overlay.style.display = "none";
    this.container.style.display = "none";
    this.enteredCode = "";
    this.display.textContent = "----";
    this.message.textContent = "";

    // Notify controls wrapper that keypad is closed
    if (this.controlsWrapper && this.controlsWrapper.setKeypadOpen) {
      this.controlsWrapper.setKeypadOpen(false);
    }

    // Hide cursor
    document.body.style.cursor = "none";

    // Re-enable controls and lock pointer
    if (this.pointerLockControls) {
      console.log("📱 Re-enabling controls and locking pointer");

      // Re-enable the controls
      this.pointerLockControls.enabled = true;

      // Wait a bit before re-locking
      setTimeout(() => {
        if (this.pointerLockControls && this.pointerLockControls.enabled) {
          this.pointerLockControls.lock();
        }
      }, 100);
    }

    if (this.onClose) {
      this.onClose();
    }
  }

  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Add creepy animations to document
if (!document.getElementById("keypad-styles")) {
  const style = document.createElement("style");
  style.id = "keypad-styles";
  style.textContent = `
    @keyframes creepy-shake {
      0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
      10% { transform: translate(-52%, -48%) rotate(-2deg); }
      20% { transform: translate(-48%, -52%) rotate(2deg); }
      30% { transform: translate(-54%, -50%) rotate(-1deg); }
      40% { transform: translate(-46%, -50%) rotate(1deg); }
      50% { transform: translate(-50%, -54%) rotate(-2deg); }
      60% { transform: translate(-50%, -46%) rotate(2deg); }
      70% { transform: translate(-52%, -52%) rotate(-1deg); }
      80% { transform: translate(-48%, -48%) rotate(1deg); }
      90% { transform: translate(-51%, -49%) rotate(-0.5deg); }
    }
    
    @keyframes flicker {
      0%, 100% { opacity: 1; }
      41% { opacity: 1; }
      42% { opacity: 0.8; }
      43% { opacity: 1; }
      45% { opacity: 0.9; }
      46% { opacity: 1; }
      82% { opacity: 1; }
      83% { opacity: 0.7; }
      87% { opacity: 1; }
    }
    
    @keyframes pulse {
      0%, 100% { 
        box-shadow: inset 0 0 20px rgba(139, 0, 0, 0.3);
      }
      50% { 
        box-shadow: inset 0 0 30px rgba(139, 0, 0, 0.5);
      }
    }
    
    @keyframes vignette {
      0%, 100% { 
        box-shadow: inset 0 0 200px rgba(0, 0, 0, 0.8);
      }
      50% { 
        box-shadow: inset 0 0 250px rgba(0, 0, 0, 0.9);
      }
    }
  `;
  document.head.appendChild(style);
}
