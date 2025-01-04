import { Component } from "../component.ts"
import { TransformComponent } from "./transform.ts"
import { Vec2 } from "../math/index.ts"
import { type Collider } from "./collider.ts"
import { type Entity } from "../entity.ts"

export class BodyComponent<
  C extends Collider | undefined = undefined
> extends Component<{
  collision: {
    entity: Entity<[BodyComponent<Collider>], any, any>
    body: BodyComponent<Collider>
  }
}> {
  static override type = "body"

  gravity = true
  friction = new Vec2(0, 0)
  static = false

  collider?: C

  constructor(
    args: {
      collider?: C
      static?: boolean
      gravity?: boolean
      friction?: Vec2
    } = {}
  ) {
    super()

    this.collider = args.collider
    this.gravity = args.gravity ?? this.gravity
    this.friction = args.friction ?? this.friction
    this.static = args.static ?? this.static
  }

  get velocity() {
    const transform = this.entity?.getComponent(TransformComponent)
    if (transform) {
      return transform.position.clone().sub(transform.prev.position)
    }

    return new Vec2(0, 0)
  }

  setVelocity(value: Vec2) {
    const transform = this.entity?.getComponent(TransformComponent)
    if (transform) {
      transform.prev.position = transform.position.clone().sub(value)
    }
  }

  onCollisionResolve(other: BodyComponent<Collider>) {
    return true
  }
}
