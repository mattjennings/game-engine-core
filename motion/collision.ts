import type { SystemFixedUpdateFn, SystemQuery } from "../system.ts"
import { System } from "../system.ts"
import { BodyComponent, TransformComponent } from "../motion/index.ts"
import { BoxCollider, type Collider } from "./collider.ts"
import { type Entity } from "../entity.ts"
import { Vec2 } from "../math/index.ts"

type Query = SystemQuery<[BodyComponent, TransformComponent]>
export class CollisionSystem extends System<Query> {
  override query = [BodyComponent, TransformComponent] as const

  override fixedUpdate: SystemFixedUpdateFn<Query> = (entities) => {
    let entitiesWithColliders: [
      Entity<[BodyComponent<Collider>], any, any>,
      BodyComponent<Collider>,
      TransformComponent
    ][] = []

    for (const [entity, [body, transform]] of entities) {
      if (body.collider) {
        entitiesWithColliders.push([entity as any, body as any, transform])
      }
    }

    for (let i = 0; i < entitiesWithColliders.length; i++) {
      const [aEntity, aBody, aTransform] = entitiesWithColliders[i]
      for (let j = i + 1; j < entitiesWithColliders.length; j++) {
        const [bEntity, bBody, bTransform] = entitiesWithColliders[j]

        if (
          aBody.collider!.intersects(
            aTransform.position,
            bTransform.position,
            bBody.collider!
          )
        ) {
          if (
            aBody.onCollisionResolve(bBody) &&
            bBody.onCollisionResolve(aBody)
          ) {
            aBody.emit("collision", { entity: bEntity, body: bBody })
            bBody.emit("collision", { entity: aEntity, body: aBody })

            // skip collision resolution
            if (aBody.static && bBody.static) {
              continue
            }

            if (
              aBody.collider instanceof BoxCollider &&
              bBody.collider instanceof BoxCollider
            ) {
              this.resolveBoxBoxCollision(
                { body: aBody, transform: aTransform },
                { body: bBody, transform: bTransform }
              )
            }
          }
        }
      }
    }
  }

  resolveBoxBoxCollision(
    a: { body: BodyComponent<BoxCollider>; transform: TransformComponent },
    b: { body: BodyComponent<BoxCollider>; transform: TransformComponent }
  ) {
    const aCollider = a.body.collider!
    const bCollider = b.body.collider!
    const mtv = this.getMTV(
      a.transform.position,
      new Vec2(aCollider.width, aCollider.height),
      b.transform.position,
      new Vec2(bCollider.width, bCollider.height)
    )

    if (mtv) {
      // Step 1: Detect collision (AABB check)
      const posA = a.transform.position.clone().add(aCollider.offset)
      const posB = b.transform.position.clone().add(bCollider.offset)

      const overlapX =
        posA.x < posB.x + bCollider.size.x && posA.x + aCollider.size.x > posB.x
      const overlapY =
        posA.y < posB.y + bCollider.size.y && posA.y + aCollider.size.y > posB.y

      if (overlapX && overlapY) {
        // Step 2: Resolve collision
        const mtv = this.getMTV(posA, aCollider.size, posB, bCollider.size)
        if (mtv) {
          if (a.body.static) {
            b.transform.position.add(mtv)
          } else if (b.body.static) {
            a.transform.position.sub(mtv)
          } else {
            a.transform.position.sub(mtv.clone().scale(0.5))
            b.transform.position.add(mtv.clone().scale(0.5))
          }
        }
      }
    }
  }

  // getHashKeys(position: Vec2, collider: Collider) {
  //   const gridSize = 100

  //   if (collider instanceof BoxCollider) {
  //     const min = collider.min().clone().add(position)
  //     const max = collider.max().clone().add(position)

  //     const minX = Math.floor(min.x / gridSize)
  //     const minY = Math.floor(min.y / gridSize)

  //     const maxX = Math.ceil(max.x / gridSize)
  //     const maxY = Math.ceil(max.y / gridSize)

  //     const keys = []

  //     for (let x = minX; x <= maxX; x += 1) {
  //       for (let y = minY; y <= maxY; y += 1) {
  //         keys.push(`${x},${y}`)
  //       }
  //     }

  //     return keys
  //   }

  //   throw new Error("Unsupported collider type")
  // }

  getMTV(posA: Vec2, sizeA: Vec2, posB: Vec2, sizeB: Vec2): Vec2 | null {
    const dx = posB.x + sizeB.x / 2 - (posA.x + sizeA.x / 2)
    const dy = posB.y + sizeB.y / 2 - (posA.y + sizeA.y / 2)
    const overlapX = sizeA.x / 2 + sizeB.x / 2 - Math.abs(dx)
    const overlapY = sizeA.y / 2 + sizeB.y / 2 - Math.abs(dy)

    if (overlapX <= 0 || overlapY <= 0) return null // No collision

    // Minimum Translation Vector
    if (overlapX < overlapY) {
      return new Vec2(dx < 0 ? -overlapX : overlapX, 0)
    } else {
      return new Vec2(0, dy < 0 ? -overlapY : overlapY)
    }
  }
}

/*
      spatialHash.current.clear()

      const processedPairs = new Set<string>()

      // Populate the spatial hash with objects
      for (const [obj, physics] of objects.current) {
        if (!physics.collider) continue
        const keys = getHashKeys(physics.position, physics.collider)
        for (const key of keys) {
          if (!spatialHash.current.has(key)) {
            spatialHash.current.set(key, [])
          }
          spatialHash.current.get(key)!.push({ obj, physics })
        }
      }

      // Check for collisions within each cell
      const pairIds = ['', ''] // scratch array to avoid allocation

      for (const objects of spatialHash.current.values()) {
        for (let i = 0; i < objects.length; i++) {
          const physics1 = objects[i].physics
          for (let j = i + 1; j < objects.length; j++) {
            const physics2 = objects[j].physics

            if (physics1.collider && physics2.collider) {
              pairIds[0] = `${physics1.id},${physics2.id}`
              pairIds[1] = `${physics2.id},${physics1.id}`

              if (
                processedPairs.has(pairIds[0]) ||
                processedPairs.has(pairIds[1])
              ) {
                continue
              }
              resolveCollision(physics1, physics2)
              processedPairs.add(pairIds[0])
              processedPairs.add(pairIds[1])
            }
          }
        }
      }
        */
