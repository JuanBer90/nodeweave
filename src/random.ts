export function createRandom(seed: number | string = 1): (index: number, salt?: number) => number {
  const seedNumber = typeof seed === 'string' ? [...seed].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261) : seed >>> 0;
  return (index: number, salt = 0) => {
    let value = (seedNumber + Math.imul(index + 1, 0x9e3779b9) + Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
    value ^= value >>> 16; value = Math.imul(value, 0x7feb352d); value ^= value >>> 15; value = Math.imul(value, 0x846ca68b); value ^= value >>> 16;
    return (value >>> 0) / 4294967296;
  };
}
