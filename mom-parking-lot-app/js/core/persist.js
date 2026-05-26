/**
 * Bridge so domain/ can trigger persistence without importing storage/
 * (avoids domain → storage per modular refactor rules). Bootstrap wires this to saveState.
 */
let persistFn = () => {};

export function wirePersist(fn) {
  persistFn = typeof fn === 'function' ? fn : () => {};
}

export function persist() {
  persistFn();
}
