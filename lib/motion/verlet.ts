import type { SystemQuery, SystemUpdateFn } from "../system.ts"
import { System, SystemEntities } from "../system.ts"
import { TransformComponent } from "./transform.ts"
import { BodyComponent } from "./body.ts"
import { Vec2 } from "../math/index.ts"

type Query = SystemQuery<[BodyComponent, TransformComponent]>

export class VerletSystem extends System<Query> {
  override query = [BodyComponent, TransformComponent] as const
  gravity = new Vec2(0, 0.01)
  maxVelocity = new Vec2(100, 100)

  constructor({
    gravity,
    maxVelocity,
  }: {
    gravity?: Vec2
    maxVelocity?: Vec2
  } = {}) {
    super()
    if (gravity) {
      this.gravity = gravity
    }

    if (maxVelocity) {
      this.maxVelocity = maxVelocity
    }
  }

  override fixedUpdate: SystemUpdateFn<Query> = (entities, { dt }) => {    
    for (const [entity, [body, transform]] of entities) {
      const velocity = transform.position
        .clone()
        .sub(transform.prev.position)
        .mul(body.friction)

      if (body.gravity && !body.static) {
        velocity.add(
          this.gravity
            .clone()
            .scale(dt ** 2)
            .scale(1000 ** 2)
        )

        if (this.maxVelocity.x !== 0) {
          const sign = Math.sign(velocity.x)
          velocity.x = Math.min(Math.abs(velocity.x), this.maxVelocity.x) * sign
        }

        if (this.maxVelocity.y !== 0) {
          const sign = Math.sign(velocity.y)
          velocity.y = Math.min(Math.abs(velocity.y), this.maxVelocity.y) * sign
        }
      }

      transform.prev.position.set(transform.position.clone())
      transform.prev.scale.set(transform.scale.clone())
      transform.prev.rotation = transform.rotation

      transform.position.add(velocity)
    }
  }
}
