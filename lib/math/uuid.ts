let uuidCounter = 0

export function uuid() {
  return (uuidCounter++).toString()
}
