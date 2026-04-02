export class Input {
  constructor(canvas) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.interact = false;
    this.map = false;
    this.click = false;
    this.mouseX = 0;
    this.mouseY = 0;

    // Drag state
    this.dragStart = null;
    this.dragging = false;
    this.dragX = 0;
    this.dragY = 0;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragEnd = false;
    this._mouseDown = false;

    window.addEventListener('keydown', e => this.onKey(e, true));
    window.addEventListener('keyup', e => this.onKey(e, false));
    // Use window so mouse position stays current even when hovering over UI elements
    window.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      // Update drag position if mouse button is held
      if (this._mouseDown) {
        this.dragging = true;
        this.dragX = e.clientX;
        this.dragY = e.clientY;
      }
    });
    canvas.addEventListener('mousedown', e => {
      this._mouseDown = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragX = e.clientX;
      this.dragY = e.clientY;
      this.dragging = false;
    });
    window.addEventListener('mouseup', () => {
      if (this.dragging) {
        this.dragEnd = true;
      }
      this._mouseDown = false;
      this.dragging = false;
    });
    canvas.addEventListener('click', e => {
      this.click = true;
      this.clickX = e.clientX;
      this.clickY = e.clientY;
    });
  }

  onKey(e, down) {
    switch (e.key.toLowerCase()) {
      case 'w': case 'arrowup': this.up = down; break;
      case 's': case 'arrowdown': this.down = down; break;
      case 'a': case 'arrowleft': this.left = down; break;
      case 'd': case 'arrowright': this.right = down; break;
      case 'e': if (down) this.interact = true; break;
      case 'm': if (down) this.map = !this.map; break;
    }
  }

  consumeClick() {
    if (this.click) {
      this.click = false;
      return { x: this.clickX, y: this.clickY };
    }
    return null;
  }

  consumeInteract() {
    if (this.interact) {
      this.interact = false;
      return true;
    }
    return false;
  }

  // Returns { x, y } of the drag start position and clears it, or null
  consumeDragStart() {
    if (this.dragStart) {
      const start = this.dragStart;
      this.dragStart = null;
      return start;
    }
    return null;
  }

  // Returns current drag state without consuming it
  getDragState() {
    return {
      dragging: this.dragging,
      x: this.dragX,
      y: this.dragY,
      startX: this.dragStartX,
      startY: this.dragStartY,
    };
  }

  // Returns true if a drag just ended, then clears the flag
  consumeDragEnd() {
    if (this.dragEnd) {
      this.dragEnd = false;
      return true;
    }
    return false;
  }
}
