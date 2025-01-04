import { Component } from "../component.ts"

export interface StateDefinition<
  TState extends string,
  TEvents extends string,
  TPayloads extends { [key in TEvents]?: any },
  TContext extends Record<string, any> = {}
> {
  enter?: (
    machine: StateMachineComponent<TState, TEvents, TPayloads, TContext>
  ) => void
  exit?: (
    machine: StateMachineComponent<TState, TEvents, TPayloads, TContext>
  ) => void
  on?: {
    [key in TEvents]?:
      | (TState | false)
      | ((
          payload: TPayloads[key],
          machine: StateMachineComponent<TState, TEvents, TPayloads, TContext>
        ) => TState | false)
  }
}

export class StateMachineComponent<
  TState extends string,
  TEvents extends string,
  TPayloads extends { [key in TEvents]?: any },
  TContext extends Record<string, any> = {}
> extends Component<{
  transition: {
    from: TState
    to: TState
    event: TEvents
    payload: TPayloads[TEvents]
  }
}> {
  current: TState
  context: TContext

  private states: {
    [key in TState]: StateDefinition<
      NoInfer<TState>,
      NoInfer<TEvents>,
      NoInfer<TPayloads>,
      NoInfer<TContext>
    >
  }

  constructor(args: {
    initial: NoInfer<TState>
    types?: {
      payloads?: TPayloads
      context?: TContext
    }
    context?: NoInfer<TContext>
    states: {
      [key in TState]: StateDefinition<
        NoInfer<TState>,
        TEvents,
        TPayloads,
        NoInfer<TContext>
      >
    }
  }) {
    super()
    this.states = args.states
    this.current = args.initial
    this.context = (args.context ?? {}) as TContext
  }

  send<K extends TEvents>(
    event: K,
    ...args: isUnknown<TPayloads[K]> extends true
      ? []
      : isOptional<TPayloads[K]> extends true
      ? [TPayloads[K]?]
      : [TPayloads[K]]
  ) {
    const state = this.states[this.current]
    const transition = state.on?.[event]

    if (typeof transition === "function") {
      const payload = args[0] as TPayloads[K]
      const next = transition(payload, this)
      if (next) {
        this.current = next
        this.emit("transition", {
          from: this.current,
          to: next,
          event,
          payload,
        })

        state.enter?.(this)
        this.states[next].enter?.(this)
      }
    } else if (typeof transition === "string") {
      this.current = transition as TState
    }
  }
}

type isUnknown<T> = unknown extends T ? true : false
type isOptional<T> = undefined extends T ? true : false

// const sm = new StateMachine({
//   initial: "idle",
//   types: {} as {
//     payloads: {
//       walk: { id: string }
//     }
//   },
//   states: {
//     idle: {
//       on: {
//         walk: (payload) => {
//           return "idle"
//         },
//       },
//     },
//     walk: {
//       on: {
//         idle: "idle",
//       },
//     },
//   },
// })

// sm.send("idle")
