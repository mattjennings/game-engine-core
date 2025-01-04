import { Component } from "../component.ts"
import type { Vec2Like } from "../math/index.ts"
import { Vec2 } from "../math/index.ts"

export interface Transform {
  position: Vec2
  rotation: number
  scale: Vec2
}

export class TransformComponent extends Component implements Transform {
  static override type = "transform"

  rotation: number = 0
  position = new Vec2(0, 0)
  scale = new Vec2(1, 1)

  prev: Transform

  constructor(args: {
    position?: Vec2Like
    rotation?: number
    scale?: number | Vec2Like
  }) {
    super()
    if (args.position) {
      this.position = new Vec2(args.position)
    }

    if (args.rotation) {
      this.rotation = args.rotation
    }

    if (args.scale) {
      this.scale = new Vec2(args.scale)
    }

    this.prev = {
      position: this.position.clone(),
      rotation: this.rotation,
      scale: this.scale.clone(),
    }
  }
}
