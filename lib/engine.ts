import type { ConstructorOf } from "./types.d.ts";
import { EventEmitter } from "./event-emitter.ts";
import { Scene } from "./scene.ts";
import type { System } from "./system.ts";
import { Entity } from "./entity.ts";
import type { Component } from "./component.ts";
import { VerletSystem } from "./motion/verlet.ts";
import { CollisionSystem } from "./motion/collision.ts";
import { ConstraintSystem } from "./motion/constraints.ts";

export interface EngineArgs<Renderer = any> {
  fixedUpdateFps?: number;
  systems?: System[];
  renderer?: Renderer
}

export class Engine<TSceneKey extends string, Renderer = any>
  extends EventEmitter<{
    update: { dt: number };
    fixedupdate: { dt: number };
    draw: Renderer;
    scenechange: { name: TSceneKey; scene: Scene<Renderer> };
  }> {
  static defaultSystems = [
    new VerletSystem(),
    new CollisionSystem(),
    new ConstraintSystem(),
  ];

  systems: System[] = [];
  scenes: Record<TSceneKey, () =>  Scene<Renderer>> = {} as any;
  currentScene!: Scene<Renderer>;
  fixedUpdateFps = 60;

  elapsedTime = 0;
  deltaTime = 0;
  fixedAccumulator = 0;

  paused = false;
  started = false;

  constructor(args: EngineArgs<Renderer> = {}) {
    super();

    let systems = args.systems ?? Engine.defaultSystems;

    if (args.fixedUpdateFps) {
      this.fixedUpdateFps = args.fixedUpdateFps;
    }

    for (const system of systems) {
      this.addSystem(system);
    }
  }

  start({ scene }: { scene: TSceneKey }) {
    this.started = true;
    this.gotoScene(scene);
  }

  update(currentTime: number) {
    if (!this.paused) {
      this.deltaTime = currentTime - this.elapsedTime;
      this.elapsedTime = currentTime;
      this.fixedAccumulator += this.deltaTime;

      const dt = this.deltaTime;

      this.emit("update", { dt });
      this.currentScene.update({ dt });

      const fixedDt = 1000 / this.fixedUpdateFps;

      while (this.fixedAccumulator >= fixedDt) {
        this.emit("fixedupdate", { dt: fixedDt });
        this.currentScene.fixedUpdate({ dt: fixedDt });
        this.fixedAccumulator -= fixedDt;
      }
    }
  }

  draw(renderer: Renderer) {
    if (!this.paused) {
      this.emit("draw", renderer);
      this.currentScene.draw(renderer);
    }
  }

  addSystem(system: System) {
    this.systems.push(system);
    system.engine = this as any;
  }

  removeSystem(system: System) {
    this.systems.splice(this.systems.indexOf(system), 1);
  }

  getSystem(system: ConstructorOf<System>) {
    return this.systems.find((s) => s.constructor === system);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  gotoScene(name: TSceneKey) {
    if (!this.scenes[name]) {
      throw new Error(`Scene "${name.toString()}" not found`);
    }

    const scene = this.scenes[name]();

    if (!!this.currentScene) {
      this.currentScene.off("entityadd", this.onEntityAdd);
      this.currentScene.off("entityremove", this.onEntityRemove);
    }
    this.currentScene = scene;
    this.currentScene.on("entityadd", this.onEntityAdd);
    this.currentScene.on("entityremove", this.onEntityRemove);

    this.emit("scenechange", {
      name: name,
      scene: this.currentScene,
    });
    this.currentScene.emit("start", undefined);
  }

  protected onEntityAdd = () => {};

  protected onEntityRemove = () => {};

  get Scene() {
    const _engine = this as Engine<TSceneKey>;
    const ctor = class extends Scene<Renderer> {
      override engine = _engine;
    };

    return ctor;
  }

  registerScene<Name extends TSceneKey>(
    name: Name,
    cb: (scene: Scene<Renderer>) => Scene<Renderer>,
  ) {
    this.scenes[name] = () => {
      const scene = new Scene(this, name);
      // @ts-ignore
      scene.systems = this.systems;
      return cb(scene);
    };
  }

  createEntity<
    Comp extends Component<any>[] = [],
    Props extends Record<string, any> = {},
    Events extends Record<string, unknown> = {},
    Ent extends Entity<Comp, Props, Events, Engine<TSceneKey>> = Entity<
      Comp,
      Props,
      Events,
      Engine<TSceneKey>
    >,
  >(name: string): Ent {
    const entity = new Entity(this, name);

    return entity as any as Ent;
  }

  timer = {
    wait: (s: number) => {
      return new Promise<void>((resolve) => {
        const onupdate = ({ dt }: { dt: number }) => {
          s -= dt;
          if (s <= 0) {
            this.off("update", onupdate);
            resolve();
          }
        };

        this.on("update", onupdate);
      });
    },
  };
}
