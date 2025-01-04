export class EventEmitter<
  Events extends Record<string, unknown> = Record<string, unknown>
> {
  // needed for type inference
  #events!: Events

  listeners: Partial<
    Record<keyof Events, Set<(payload: Events[keyof Events]) => void>>
  > = {}

  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set()
    }
    this.listeners[event]!.add(
      listener as (payload: Events[keyof Events]) => void
    )
    return this
  }

  off<K extends keyof Events>(event: K, listener: Function) {
    this.listeners[event]?.delete(listener as any)
    return this
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    if (!this.listeners[event]) {
      return
    }

    for (const listener of this.listeners[event]) {
      listener(payload)
    }
  }

  removeAllListeners() {
    this.listeners = {}
  }
}

export type EventsOf<T> = T extends EventEmitter<infer U> ? U : never
export type EventNameOf<T> = keyof EventsOf<T>
