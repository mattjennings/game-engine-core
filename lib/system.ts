import type { ConstructorOf } from "./types.d.ts"
import type { Engine } from "./engine.ts"
import type { Entity } from "./entity.ts"
import { EventEmitter } from "./event-emitter.ts"
import type { Component } from "./component.ts"


export type SystemQuery<T extends Readonly<Component[]>> = Readonly<{
  [K in keyof T]: ConstructorOf<T[K]>
}>

export type SystemEntities<T extends SystemQuery<any>> = Map<
  Entity,
  {
    [K in keyof T]: InstanceType<T[K]>
  }
>

export class System<
  T extends SystemQuery<any> = SystemQuery<any>
> extends EventEmitter<{
  entityadd: Entity
  entityremoved: Entity
}> {
  readonly query!: T
  engine!: Engine<any>

  update?: (entities: any, event: UpdateEvent) => void
  fixedUpdate?: (entities: any, event: UpdateEvent) => void
  draw?: (entities: any, renderer: any) => void

  onEntityAdd = (entity: Entity) => {}
  onEntityRemove = (entity: Entity) => {}
}

export type SystemUpdateFn<T extends SystemQuery<any>> = (
  entities: SystemEntities<T>,
  event: UpdateEvent
) => void

export type SystemDrawFn<T extends SystemQuery<any>> = (
  entities: SystemEntities<T>
) => void

export type SystemFixedUpdateFn<T extends SystemQuery<any>> = (
  entities: SystemEntities<T>,
  event: UpdateEvent
) => void

export type UpdateEvent = {
  dt: number
}
