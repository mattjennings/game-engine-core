import { Component } from "../component.ts"
import type { SystemFixedUpdateFn, SystemQuery } from "../system.ts"
import { System } from "../system.ts"
import { TransformComponent } from "./transform.ts"
import { BodyComponent } from "./body.ts"
import type { EntityWithComponent } from "../entity.ts"


export class ConstraintsComponent extends Component {
  constraints = new Set<Constraint>()

  constructor(constraints: Constraint[]) {
    super()

    for (const constraint of constraints) {
      this.constraints.add(constraint)
    }
  }

  add(constraint: Constraint) {
    this.constraints.add(constraint)
  }

  remove(constraint: Constraint) {
    this.constraints.delete(constraint)
  }
}

export abstract class Constraint {
  iterations = 1

  apply(): void {
    for (let i = 0; i < this.iterations; i++) {
      this.applyOnce()
    }
  }

  protected abstract applyOnce: () => void
}

type Query = SystemQuery<[ConstraintsComponent]>

export class ConstraintSystem extends System<Query> {
  override query = [ConstraintsComponent] as const

  override fixedUpdate: SystemFixedUpdateFn<Query> = (entities) => {
    for (const [entity, [constraints]] of entities) {
      for (const constraint of constraints.constraints) {
        constraint.apply()
      }
    }
  }
}

export class DistanceConstraint extends Constraint {
  override iterations = 1

  constructor(
    private entityA:
      | EntityWithComponent<[TransformComponent]>
      | EntityWithComponent<[TransformComponent, BodyComponent]>,
    private entityB:
      | EntityWithComponent<[TransformComponent]>
      | EntityWithComponent<[TransformComponent, BodyComponent]>,
    private distance: number
  ) {
    super()
  }

  applyOnce = () => {
    const aTransform = this.entityA.getComponent(TransformComponent)
    const bTransform = this.entityB.getComponent(TransformComponent)
    const aBody = this.entityA.getComponent(BodyComponent)
    const bBody = this.entityB.getComponent(BodyComponent)

    if (aBody?.static && bBody?.static) {
      return
    }

    const delta = bTransform.position.clone().sub(aTransform.position)

    const currentDistance = Math.sqrt(delta.x ** 2 + delta.y ** 2)
    const correctionFactor = (this.distance - currentDistance) / currentDistance

    if (aBody?.static) {
      bTransform.position.add(delta.clone().scale(correctionFactor))
    } else if (bBody?.static) {
      aTransform.position.sub(delta.clone().scale(correctionFactor))
    } else {
      const offset = delta.scale(0.5).clone().scale(correctionFactor)
      aTransform.position.sub(offset)
      bTransform.position.add(offset)
    }
  }
}

export class StickConstraint extends Constraint {
  constructor(
    private entityA:
      | EntityWithComponent<[TransformComponent]>
      | EntityWithComponent<[TransformComponent, BodyComponent]>,
    private entityB:
      | EntityWithComponent<[TransformComponent]>
      | EntityWithComponent<[TransformComponent, BodyComponent]>,
    private distance: number
  ) {
    super()
  }

  applyOnce = () => {
    const aTransform = this.entityA.getComponent(TransformComponent)
    const bTransform = this.entityB.getComponent(TransformComponent)
    const aBody = this.entityA.getComponent(BodyComponent)
    const bBody = this.entityB.getComponent(BodyComponent)
    const aPosition = aTransform.position.clone()
    const bPosition = bTransform.position.clone()

    const stickCenter = aPosition.add(bPosition).scale(0.5)
    const stickDir = bPosition.sub(aPosition).normalize()

    if (!aBody?.static) {
      aTransform.position.x = stickCenter.x - (stickDir.x * this.distance) / 2
      aTransform.position.y = stickCenter.y - (stickDir.y * this.distance) / 2
    }

    if (!bBody?.static) {
      bTransform.position.x = stickCenter.x + (stickDir.x * this.distance) / 2
      bTransform.position.y = stickCenter.y + (stickDir.y * this.distance) / 2
    }
  }
}

export class RopeConstraint extends Constraint {
  override iterations = 3
  private constraints: Constraint[] = []

  constructor(
    entities: EntityWithComponent<[TransformComponent, BodyComponent<any>]>[],
    segmentLength: number
  ) {
    super()
    for (let i = 0; i < entities.length - 1; i++) {
      this.constraints.push(
        new StickConstraint(entities[i], entities[i + 1], segmentLength)
      )
    }
  }

  applyOnce = () => {
    for (const constraint of this.constraints) {
      constraint.apply()
    }
  }
}
