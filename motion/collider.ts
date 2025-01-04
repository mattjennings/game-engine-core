import { Vec2, uuid } from "../math/index.ts"


export interface Bounds {
  width: number
  height: number
}

export abstract class Collider {
  id = uuid()
  offset = new Vec2(0, 0)
  abstract width: number
  abstract height: number
  abstract intersects(pSelf: Vec2, pOther: Vec2, cOther: Collider): boolean
  get size(): Vec2 {
    return new Vec2(this.width, this.height)
  }
}

interface BoxColliderOptions {
  width: number
  height: number
}

export class BoxCollider extends Collider {
  width: number
  height: number

  constructor({ width, height }: BoxColliderOptions) {
    super()
    this.width = width
    this.height = height
  }

  intersects(pSelf: Vec2, pOther: Vec2, cOther: Collider): boolean {
    if (cOther instanceof BoxCollider) {
      return (
        pSelf.x < pOther.x + cOther.width &&
        pSelf.x + this.width > pOther.x &&
        pSelf.y < pOther.y + cOther.height &&
        pSelf.y + this.height > pOther.y
      )
    }

    return false
  }
}
