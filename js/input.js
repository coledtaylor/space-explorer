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

    window.addEventListener('keydown', e => this.onKey(e, true));
    window.addEventListener('keyup', e => this.onKey(e, false));
    // Use window so mouse position stays current even when hovering over UI elements
    window.addEventListener('mousemove', e => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
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
}
