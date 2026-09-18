# Nodeweave

Nodeweave is a small, framework-agnostic TypeScript library for rendering animated node-and-relationship visualizations in SVG. It is useful for maps of people, products, processes, organizations, dependencies, infrastructure, concepts, and any other connected entities. It does not prescribe an architecture diagram or a domain vocabulary.

## Install

```sh
npm install nodeweave
```

Import the optional base styles once in the application that owns the visualization:

```ts
import { Nodeweave } from 'nodeweave';
import 'nodeweave/styles.css';
```

## Minimal example

```ts
const canvas = document.querySelector<HTMLElement>('#network')!;

const network = new Nodeweave(canvas, {
  width: 800,
  height: 500,
  nodes: [
    { id: 'research', label: 'Research', position: { x: 150, y: 150 }, color: '#52d8ff' },
    { id: 'launch', label: 'Launch', detail: 'A shared outcome', position: { x: 520, y: 320 }, color: '#a68cff' },
  ],
  connections: [{ from: 'research', to: 'launch' }],
});

// Later, when its owner is removed:
network.destroy();
```

The container controls the displayed SVG size; `width` and `height` define its coordinate system.

## Nodes and positions

Every node has an id, a label, and an explicit position. `detail` adds secondary text. `labelPosition` defaults to a position just right of the node, but can be placed and aligned independently. `geometry` controls the decorative core, rings, particles, and micro-marks. Global `nodeDefaults` are shallow defaults, while a node’s values take precedence.

```ts
{
  id: 'person-1', label: 'Amina', detail: 'Design',
  position: { x: 220, y: 180 },
  labelPosition: { x: 260, y: 176, anchor: 'start' },
  color: '#62e2a5',
  geometry: { coreRadius: 5, spread: 34, particleCount: 65, hub: true },
  className: 'person-node', metadata: { team: 'design' },
}
```

Nodeweave deliberately uses explicit coordinates today. Keeping positions as `{ x, y }` makes a future responsive-layout layer additive rather than a breaking change; consumers can currently remount with another set of positions at a breakpoint.

## Connections

Connections name a source and target node. Their endpoints automatically stop at a node’s visual reach. They accept a color or a source-to-target gradient, opacity, width, line style, optional subtle `markers`, CSS class, and a custom SVG path resolver.

```ts
{
  id: 'research-to-launch', from: 'research', to: 'launch',
  fromColor: '#52d8ff', toColor: '#a68cff', width: 1.25,
  path: ({ anchors }) =>
    `M${anchors.start.x} ${anchors.start.y} C320 120 410 360 ${anchors.end.x} ${anchors.end.y}`,
}
```

## Styling

The base stylesheet gives a neutral SVG foundation. Use node and connection `className` values, documented `.nodeweave`, `.nw-node`, `.nw-connection`, `.nw-ambient`, `.nw-label--title`, and `.nw-label--detail` hooks, or CSS custom properties:

```css
#network {
  --nodeweave-label-color: #f4f7fb;
  --nodeweave-detail-color: #8e9aae;
  --nodeweave-font-family: ui-monospace, monospace;
  --nodeweave-title-size: .86rem;
}
```

Colors passed in configuration are assigned directly to SVG elements, so normal CSS colors and custom properties are both supported.

## Ambient network

Ambient points are opt-in and deterministic with a seed. Hubs concentrate the generated field around important regions. Motion uses one requestAnimationFrame loop, automatically pauses while the SVG is outside the viewport when `IntersectionObserver` is available, and is cancelled on destroy.

```ts
ambient: {
  enabled: true, count: 400, seed: 'planning-map',
  colors: ['#58daf5', '#73a9ff', '#6be0a0'],
  hubs: [{ x: 400, y: 240, bias: 1.2 }],
  reach: 38, connectionOpacity: .07,
  movement: true, speed: .00065,
}
```

## Animation and reduced motion

`animation` controls deterministic intro timing. Set `enabled: false` to render immediately. By default Nodeweave respects `prefers-reduced-motion`; pass `respectReducedMotion: false` only when that is appropriate for the experience. `replay()` cancels the previous intro and starts it from the beginning without resetting the runtime layout.

```ts
animation: { enabled: true, duration: 560, delay: 100, stagger: 90, easing: 'cubic-bezier(.22,1,.36,1)' }
```

### Progressive builds

`animation.build` separates the construction of node geometry, labels/details, connections, and ambient content. Supported node effects are `fade`, `scale`, and `fade-scale`; connections use `fade` or `draw`. An explicit node `sequence` must include every node exactly once. A connection sequence, when supplied, must likewise include every connection exactly once.

```ts
animation: {
  duration: 440,
  stagger: 130,
  build: {
    sequence: ['research', 'launch'],
    geometry: { effect: 'fade-scale', duration: 440 },
    labels: { effect: 'fade', delay: 80, duration: 320 },
    connections: { effect: 'draw', delay: 110, duration: 560 },
    ambient: { effect: 'fade', delay: 200 },
  },
}
```

The node sequence is construction order, not a graph traversal. Replay always uses the current node positions; call `resetLayout()` first when reconstruction should start at the declarative layout.

## Dragging and runtime layout

Dragging is opt-in. It uses Pointer Events, supports mouse/touch/pen, captures the active pointer, and is automatically unavailable while a build animation is running. It becomes available after construction finishes and is suspended again by `replay()`.

```ts
const network = new Nodeweave(canvas, {
  // ...nodes and connections
  interaction: {
    drag: {
      enabled: true,
      bounds: 'container', // default; use 'none' for unbounded coordinates
      onMove: ({ id, position }) => console.log(id, position),
    },
  },
});
```

Set `draggable: false` on an individual node to opt it out. A dragged node is a single SVG group: its core, rings, particles, labels, detail text, and hit region stay anchored together. Only relationships incident to that node are recomputed while it moves.

Nodeweave keeps supplied configuration immutable. It owns a separate runtime layout map:

```ts
network.setLayout({ research: { x: 210, y: 140 } }); // partial layouts are supported
const layout = network.getLayout(); // returns a safe copy
network.resetLayout(); // restores every declarative position
```

`setLayout()` rejects unknown node IDs and non-finite coordinates. Drag callbacks receive `{ id, previousPosition, position, pointerType }`, which can be used by a consumer to persist a layout. Dragging provides pointer semantics only; Nodeweave does not falsely expose decorative nodes as keyboard buttons.

## Lifecycle and TypeScript

`new Nodeweave(container, options)` mounts one SVG into the supplied HTMLElement. `resize(width, height)` changes its viewBox. `replay()` repeats its configured build at the current runtime layout. `getLayout()`, `setLayout()`, and `resetLayout()` manage that layout. `destroy()` is idempotent and removes the SVG, pointer listeners/capture, timers, animation frame, and observer. Calls that cannot be meaningful after destroy throw a useful error.

The package ships strict declaration files. All configuration types—including `NodeweaveOptions`, `NodeDefinition`, `ConnectionDefinition`, `ConnectionPathContext`, and `AmbientOptions`—are exported from the package root.

## Playground

`playground/` is a consumer-style Vite application that recreates the Dexstoore desktop visualization entirely through `import { Nodeweave } from 'nodeweave'`. Its scene data, typography, colors, and custom connector curves are owned by the playground, not the library.

```sh
npm run playground
```

## Public API

- `Nodeweave`: constructor, `element`, `nodes`, `connections`, `getLayout()`, `setLayout()`, `resetLayout()`, `replay()`, `resize()`, and `destroy()`.
- `resolveNodes()`, `resolveConnections()`, and `resolveBuildSequence()`: exported validation/default-resolution helpers.
- `anchors()`: calculates the default visible endpoints for two resolved nodes.
- `createRandom()`: deterministic indexed random generator used for repeatable visual fields.
