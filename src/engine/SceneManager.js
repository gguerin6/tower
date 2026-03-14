export class SceneManager {
    constructor() {
        this.scenes = {};
        this.stack = [];
    }

    register(name, scene) {
        this.scenes[name] = scene;
    }

    switch(name, params) {
        if (this.stack.length > 0) {
            this.current().exit();
            this.stack = [];
        }
        this.needsBgClear = true;
        const scene = this.scenes[name];
        if (!scene) throw new Error(`Scene "${name}" not found`);
        this.stack.push(scene);
        scene.enter(params);
    }

    push(name, params) {
        const scene = this.scenes[name];
        if (!scene) throw new Error(`Scene "${name}" not found`);
        this.stack.push(scene);
        scene.enter(params);
    }

    pop() {
        if (this.stack.length > 0) {
            const scene = this.stack.pop();
            scene.exit();
        }
    }

    current() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    update(dt) {
        const scene = this.current();
        if (scene) scene.update(dt);
    }

    render(renderer) {
        // Render all scenes in stack (for overlays)
        for (const scene of this.stack) {
            try {
                scene.render(renderer);
            } catch (e) {
                console.error(`Error rendering scene:`, e);
            }
        }
    }
}
