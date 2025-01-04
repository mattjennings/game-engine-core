export type Vec2Like = Vec2 | { x: number; y: number }

export class Vec2 {
  x: number = 0
  y: number = 0

  constructor(vec: Vec2Like | number, y?: number) {
    if (typeof vec === "number") {
      this.x = vec
      this.y = y ?? 0
    } else {
      if (vec instanceof Vec2) {
        this.x = vec.x
        this.y = vec.y
      } else {
        if (vec.x === undefined || vec.y === undefined) {
          throw new Error("Invalid Vec2Like object")
        }
        this.x = vec.x
        this.y = vec.y
      }
    }
  }

  set(v: Vec2) {
    this.x = v.x
    this.y = v.y
    return this
  }

  add(v: Vec2) {
    this.x += v.x
    this.y += v.y
    return this
  }

  sub(v: Vec2) {
    this.x -= v.x
    this.y -= v.y
    return this
  }

  mul(v: Vec2) {
    this.x *= v.x
    this.y *= v.y
    return this
  }

  div(v: Vec2) {
    this.x /= v.x
    this.y /= v.y
    return this
  }

  scale(s: number) {
    this.x *= s
    this.y *= s
    return this
  }

  dot(v: Vec2) {
    return this.x * v.x + this.y * v.y
  }

  cross(v: Vec2) {
    return this.x * v.y - this.y * v.x
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  negate() {
    this.x = -this.x
    this.y = -this.y
    return this
  }

  normalize() {
    const len = this.length()
    if (len === 0) {
      return this
    }

    this.x /= len
    this.y /= len

    return this
  }

  magnitude() {
    return this.length()
  }

  distance(v: Vec2) {
    return this.sub(v).length()
  }

  angle(v: Vec2) {
    return Math.atan2(this.cross(v), this.dot(v))
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  isZero() {
    return this.x === 0 && this.y === 0
  }

  static fromAngle(angle: number) {
    return new Vec2(Math.cos(angle), Math.sin(angle))
  }

  static fromArray([x, y]: [number, number]) {
    return new Vec2(x, y)
  }

  static fromObject({ x, y }: { x: number; y: number }) {
    return new Vec2(x, y)
  }

  static Down = new Vec2(0, 1)
  static Up = new Vec2(0, -1)
  static Left = new Vec2(-1, 0)
  static Right = new Vec2(1, 0)
}
