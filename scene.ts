import type { AnyEntity, Entity } from "./entity.ts";
import { EventEmitter } from "./event-emitter.ts";
import type { System, SystemEntities, SystemQuery } from "./system.ts";
import type { ConstructorOf } from "./types.d.ts";
import type { Engine } from "./engine.ts";

export type SceneUpdateEvent = { dt: number };

export class Scene<Renderer extends any = any> extends EventEmitter<{
  start: void;
  end: void;
  preupdate: { dt: number };
  update: { dt: number };
  postupdate: { dt: number };
  prefixedupdate: { dt: number };
  fixedupdate: { dt: number };
  postfixedupdate: { dt: number };
  predraw: { renderer: Renderer };
  draw: { renderer: Renderer };
  postdraw: { renderer: Renderer };
  entityadd: Entity<any, any, any>;
  entityremove: Entity<any, any, any>;
}> {
  engine: Engine<any, Renderer>;
  paused = false;
  elapsedTime = 0;
  name: string;

  entities: EntityManager;

  constructor(engine: Engine<any, Renderer>, name: string) {
    super();

    this.name = name;
    this.engine = engine;
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    this.entities = new EntityManager(engine.systems);
  }

  addEntity<T extends AnyEntity>(entity: T) {
    entity.scene = this;
    this.entities.addEntity(entity);
    entity.emit("add", this);
    this.emit("entityadd", entity);
    return entity;
  }

  removeEntity(entity: Entity<any, any, any>, destroy = false) {
    entity.scene = undefined;

    if (destroy) {
      entity.destroy();
    }

    this.entities.removeEntity(entity);
    this.emit("entityremove", entity);
    entity.emit("remove", this);
  }

  update(args: { dt: number }) {
    if (this.paused) {
      return;
    }

    this.emit("preupdate", args);

    this.emit("update", args);
    this.elapsedTime += args.dt;

    for (const system of this.engine.systems) {
      system.update?.(this.entities.byQuery.get(system.query)!, args);
    }

    this.emit("postupdate", args);
  }

  fixedUpdate(args: { dt: number }) {
    if (this.paused) {
      return;
    }

    this.emit("prefixedupdate", args);
    this.emit("fixedupdate", args);
    for (const system of this.engine.systems) {
      system.fixedUpdate?.(this.entities.byQuery.get(system.query)!, args);
    }
    this.emit("postfixedupdate", args);
  }

  draw(renderer: Renderer) {
    if (this.paused) {
      return;
    }

    this.emit("predraw", { renderer });

    this.emit("draw", { renderer });
    for (const system of this.engine.systems) {
      system.draw?.(this.entities.byQuery.get(system.query)!, renderer);
    }

    this.emit("postdraw", { renderer });
  }

  onStart(listener: () => void): this {
    return this.on("start", listener);
  }

  onEnd(listener: () => void): this {
    return this.on("end", listener);
  }

  onUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("update", listener);
  }

  onPreUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("preupdate", listener);
  }

  onPostUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("postupdate", listener);
  }

  onPreFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("prefixedupdate", listener);
  }

  onFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("fixedupdate", listener);
  }

  onPostFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.on("postfixedupdate", listener);
  }

  onDraw(listener: () => void): this {
    return this.on("draw", listener);
  }

  onPreDraw(listener: () => void): this {
    return this.on("predraw", listener);
  }

  onPostDraw(listener: () => void): this {
    return this.on("postdraw", listener);
  }
}

class EntityManager {
  all = new Set<Entity<any, any, any>>();
  byQuery = new Map<
    SystemQuery<any>,
    SystemEntities<readonly ConstructorOf<any>[]>
  >();
  systems: System[] = [];

  constructor(systems: System[]) {
    this.systems = systems;

    for (const system of systems) {
      this.byQuery.set(system.query, new Map());
    }
  }

  addEntity(entity: Entity<any, any, any>) {
    this.all.add(entity);
    this.updateEntity(entity);
  }

  removeEntity(entity: Entity<any, any, any>) {
    this.all.delete(entity);

    for (const [query, entities] of this.byQuery) {
      if (entities.get(entity)) {
        entities.delete(entity);
      }
    }
  }

  updateEntity(entity: Entity<any, any, any>) {
    for (const system of this.systems) {
      let isForSystem = true;
      const components: any[] = [];
      for (const ctor of system.query) {
        const component = entity.components.get(ctor as any);

        if (component) {
          components.push(component);
        } else {
          isForSystem = false;
          break;
        }
      }

      if (isForSystem) {
        this.byQuery.get(system.query)!.set(entity, components);
      }
    }
  }
}
