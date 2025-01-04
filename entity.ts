import type { ConstructorOf } from "./types.d.ts"
import { Component } from "./component.ts"
import type { EventNameOf, EventsOf } from "./event-emitter.ts"
import { EventEmitter } from "./event-emitter.ts"
import type { Scene, SceneUpdateEvent } from "./scene.ts"
import type { Engine } from "./engine.ts"

export type EntityEvents<E extends Record<string, unknown>> = E & {
  add: Scene
  remove: Scene
  destroy: undefined
}
export class Entity<
  Comp extends Component<any>[] = [],
  Props extends Record<string, any> = {},
  Events extends Record<string, unknown> = {},
  Eng extends Engine<any> = Engine<any>
> extends EventEmitter<EntityEvents<Events>> {
  name?: string = "Entity"
  engine: Eng
  scene?: Scene
  components = new Map<ConstructorOf<Comp[number]>, Comp[number]>()

  constructor(engine: Eng, name?: string) {
    super()
    this.engine = engine
    this.name = name
  }

  addToScene(scene: Scene) {
    scene.addEntity(this as any)
  }

  moveToScene(scene: Scene) {
    if (this.scene) {
      this.scene.removeEntity(this as any)
    }

    scene.addEntity(this as any)
  }

  /**
   * Removes the entity from the scene but does not destroy it.
   */
  removeFromScene() {
    if (this.scene) {
      this.scene.removeEntity(this as any)
    }
  }

  /**
   * Destroys the entity and removes it from the scene.
   */
  destroy() {
    if (this.scene) {
      this.scene.removeEntity(this as any, true)
    }
    this.emit("destroy", undefined as any)
    this.removeAllListeners()
    for (const [key, component] of this.components) {
      component.onRemove?.(this)
    }
  }

  set<Values extends Record<string, any>>(
    values: Values
  ): Entity<
    [
      ...Comp,
      ...(Values[keyof Values] extends Component ? [Values[keyof Values]] : [])
    ],
    Props & Values,
    Events,
    Eng
  > &
    Props &
    Values
  set<Name extends string, Value>(
    name: Name,
    value: Value
  ): Value extends Component
    ? Entity<[...Comp, Value], Props & { [K in Name]: Value }, Events, Eng> &
        Props & { [K in Name]: Value }
    : Entity<Comp, Props & { [K in Name]: Value }, Events, Eng> &
        Props & { [K in Name]: Value }

  set(...args: [string, any] | [Record<string, any>]): any {
    if (typeof args[0] === "string") {
      const [name, value] = args as [string, any]
      if (value instanceof Component) {
        this.addComponent(value)
      }

      // @ts-ignore
      this[name] = value
      return this as any
    } else if (typeof args[0] === "object") {
      const values = args[0] as Record<string, any>
      for (const [key, value] of Object.entries(values)) {
        this.set(key as string, value)
      }
      return this as any
    }

    throw new Error(
      `Unsupported data type for arguments in set. Expected string or object, received ${typeof args[0]}`
    )
  }

  self<
    NewComp extends Component<any>[] = [],
    NewProps extends Props = Props,
    NewEvents extends Events = Events
  >(
    cb: (
      entity: Entity<Comp, Props, Events, Eng> & Props
    ) => Entity<[...Comp, ...NewComp], NewProps, NewEvents, Eng> & NewProps
  ): ReturnType<typeof cb> {
    return cb.call(this as any, this as any)
  }

  addComponent<Value extends Component>(
    component: Value
  ): Entity<[...Comp, Value], Props, Events, Eng> & Props {
    component.entity = this as any
    this.components.set(
      component.constructor as ConstructorOf<Comp[number]>,
      component as any
    )
    component.onAdd?.(this as any)

    // update the systems query
    if (this.scene?.entities.all.has(this)) {
      this.scene.entities.updateEntity(this)
    }
    return this as any
  }

  removeComponent<Name extends ConstructorOf<Component>>(
    ctor: Name
  ): Entity<
    Comp extends Name ? (Comp extends [Name] ? [] : Comp) : Comp,
    Props,
    Events,
    Eng
  > &
    Props {
    const component = this.components.get(ctor as any)
    if (!component) {
      throw new Error(`Component ${ctor.name} not found`)
    }

    component.onRemove?.(this as any)
    this.components.delete(ctor as any)

    // update the systems query
    if (this.scene?.entities.all.has(this)) {
      this.scene.entities.updateEntity(this)
    }

    return this as any
  }

  getComponent<Name extends ConstructorOf<Component>>(
    ctor: Name
  ): InstanceType<Name> {
    const componentInstance = this.components.get(ctor as any)
    if (!componentInstance) {
      throw new Error(`Component ${ctor.name} not found`)
    }
    return componentInstance as InstanceType<Name>
  }

  override on<Emitter extends EventEmitter<any>>(
    emitter: Emitter,
    event: EventNameOf<Emitter>,
    listener: (payload: EventsOf<Emitter>[EventNameOf<Emitter>]) => void
  ): this

  override on<K extends keyof EntityEvents<Events>>(
    event: K,
    listener: (payload: EntityEvents<Events>[K]) => void
  ): this
  
  override on(...args: any[]) {
    if (args[0] instanceof EventEmitter) {
      args[0].on(args[1], args[2])
      return this
    }

    return super.on(args[0], args[1])
  }

  onSceneEvent<E extends EventNameOf<typeof this.scene>>(
    event: E,
    listener: (payload: EventsOf<typeof this.scene>[E]) => void
  ): this {
    if (this.scene) {
      this.scene.on(event as any, listener)
    } else {
      this.on("add", (scene) => {
        scene!.on(event as any, listener)
      })
    }

    this.on("remove", (scene) => {
      scene!.off(event as any, listener as any)
    })
    return this
  }

  onAdd(listener: (scene: Scene) => void): this {
    return this.on("add", listener)
  }

  onDestroy(listener: () => void): this {
    return this.on("destroy", listener)
  }

  onUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("update", listener)
  }

  onPreUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("preupdate", listener)
  }

  onPostUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("postupdate", listener)
  }

  onPreFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("prefixedupdate", listener)
  }

  onFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("fixedupdate", listener)
  }

  onPostFixedUpdate(listener: (ev: SceneUpdateEvent) => void): this {
    return this.onSceneEvent("postfixedupdate", listener)
  }

  onDraw(listener: () => void): this {
    return this.onSceneEvent("draw", listener)
  }

  onPreDraw(listener: () => void): this {
    return this.onSceneEvent("predraw", listener)
  }

  onPostDraw(listener: () => void): this {
    return this.onSceneEvent("postdraw", listener)
  }

  events<E extends Record<string, unknown>>(): Entity<Comp, Props, E, Eng> {
    return this as any
  }
}

export type AnyEntity = Entity<any, any, any, any>
export type EntityWithComponent<C extends Component[]> = Entity<
  C,
  any,
  any,
  any
>
