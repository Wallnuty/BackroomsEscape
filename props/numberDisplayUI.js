// NumberDisplayUI.js - Simple UI to display a single number

export class NumberDisplayUI {
  constructor() {
    this.container = null;
    this.numberDisplay = null;
    this.currentNumber = null;
    this.isVisible = false;
    this.pointerLockControls = null;
    this.controlsWrapper = null;
    this._createUI();
  }

  _createUI() {
    // Main container
    this.container = document.createElement("div");
    this.container.id = "number-display";
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 100%);
      border: 3px solid #3d0000;
      border-radius: 5px;
      padding: 50px 70px;
      z-index: 1000;
      display: none;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 
                  inset 0 0 40px rgba(61, 0, 0, 0.2),
                  0 0 30px rgba(139, 0, 0, 0.3);
      font-family: 'Courier New', monospace;
      user-select: none;
      animation: fadeIn 0.3s ease-out, flicker 0.1s infinite;
    `;

    // Number display
    this.numberDisplay = document.createElement("div");
    this.numberDisplay.style.cssText = `
      color: #8b0000;
      font-size: 140px;
      font-weight: bold;
      text-align: center;
      text-shadow: 0 0 25px rgba(139, 0, 0, 0.9),
                   0 0 50px rgba(139, 0, 0, 0.6),
                   0 5px 10px rgba(0, 0, 0, 0.8);
      font-family: 'Courier New', monospace;
      letter-spacing: 15px;
      filter: contrast(1.3);
    `;
    this.numberDisplay.textContent = "0";
    this.container.appendChild(this.numberDisplay);

    // Close button (optional - click anywhere to close)
    const instruction = document.createElement("div");
    instruction.textContent = "Click to continue...";
    instruction.style.cssText = `
      color: #4a0000;
      font-size: 16px;
      text-align: center;
      margin-top: 25px;
      font-style: italic;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(74, 0, 0, 0.8);
      animation: blink 1.5s ease-in-out infinite;
    `;
    this.container.appendChild(instruction);

    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 999;
      display: none;
      backdrop-filter: blur(5px);
    `;
    this.overlay.onclick = () => this.hide();
    this.container.onclick = () => this.hide();

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.container);

    // Add animations
    this._addStyles();
  }

  _addStyles() {
    if (!document.getElementById("number-display-styles")) {
      const style = document.createElement("style");
      style.id = "number-display-styles";
      style.textContent = `
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            text-shadow: 0 0 25px rgba(139, 0, 0, 0.9),
                         0 0 50px rgba(139, 0, 0, 0.6);
          }
          50% {
            text-shadow: 0 0 35px rgba(139, 0, 0, 1),
                         0 0 70px rgba(139, 0, 0, 0.9);
          }
        }
        
        @keyframes flicker {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.98;
          }
        }
        
        @keyframes blink {
          0%, 49%, 51%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        #number-display div:first-child {
          animation: pulse 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }

  show(number) {
    this.currentNumber = number;
    this.numberDisplay.textContent = number;
    this.isVisible = true;

    // CRITICAL: Set controls flag FIRST, before unlocking pointer
    if (this.controlsWrapper && this.controlsWrapper.setKeypadOpen) {
      this.controlsWrapper.setKeypadOpen(true);
    }

    this.overlay.style.display = "block";
    this.container.style.display = "block";

    // Exit pointer lock AND disable controls
    if (this.pointerLockControls) {
      console.log("📊 Unlocking pointer for number display");

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
    this.currentNumber = null;

    // Notify controls wrapper that display is closed
    if (this.controlsWrapper && this.controlsWrapper.setKeypadOpen) {
      this.controlsWrapper.setKeypadOpen(false);
    }

    // Hide cursor
    document.body.style.cursor = "none";

    // Re-enable controls and lock pointer
    if (this.pointerLockControls) {
      console.log("📊 Re-enabling controls and locking pointer");

      // Re-enable the controls
      this.pointerLockControls.enabled = true;

      // Wait a bit before re-locking
      setTimeout(() => {
        if (this.pointerLockControls && this.pointerLockControls.enabled) {
          this.pointerLockControls.lock();
        }
      }, 100);
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
