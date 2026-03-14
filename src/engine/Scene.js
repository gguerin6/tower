export class Scene {
    constructor(game) {
        this.game = game;
    }

    enter(params) {}
    exit() {}
    update(dt) {}
    render(renderer) {}
    onMouseDown(x, y, button) {}
    onMouseUp(x, y, button) {}
    onMouseMove(x, y) {}
    onKeyDown(key) {}
    onKeyUp(key) {}
    onWheel(deltaY) {}
}
