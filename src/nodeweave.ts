import { anchors, resolveConnections, resolveNodes } from './resolve.js';
import { createRandom } from './random.js';
import type { AmbientHub, AmbientOptions, NodeweaveInstance, NodeweaveOptions, ResolvedConnection, ResolvedNode } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = <T extends SVGElement>(name: string, className?: string): T => { const element = document.createElementNS(SVG_NS, name) as T; if (className) element.setAttribute('class', className); return element; };
const set = (element: Element, values: Record<string, string | number | undefined>): void => { for (const [key, value] of Object.entries(values)) if (value !== undefined) element.setAttribute(key, String(value)); };
const cssClass = (base: string, custom?: string): string => custom ? `${base} ${custom}` : base;

type AmbientParticle = { element: SVGCircleElement; x: number; y: number; amplitude: number; phase: number };

function safeId(value: string): string { return value.replace(/[^a-zA-Z0-9_-]/g, '-'); }

function appendNode(parent: SVGGElement, node: ResolvedNode, random: ReturnType<typeof createRandom>): void {
  const group = svg<SVGGElement>('g', cssClass('nw-node', node.className));
  group.dataset.nodeweaveNode = node.id; group.style.color = node.color; group.style.opacity = String(node.opacity);
  const visual = svg<SVGGElement>('g', 'nw-node__visual');
  const { x, y } = node.position; const { geometry } = node;
  for (let index = 0; index < geometry.particleCount; index += 1) {
    const angle = random(index, node.id.length) * Math.PI * 2;
    const distance = geometry.spread * (0.12 + (random(index, 19) ** 1.35) * 0.88);
    const particle = svg<SVGCircleElement>('circle', 'nw-node__particle');
    set(particle, { cx: (x + Math.cos(angle) * distance).toFixed(2), cy: (y + Math.sin(angle) * distance).toFixed(2), r: (0.35 + random(index, 23) * 0.85).toFixed(2), opacity: (0.18 + random(index, 29) * 0.62).toFixed(3) }); visual.append(particle);
  }
  for (const [className, radius] of [['nw-node__ring nw-node__ring--inner', geometry.spread * geometry.innerRingScale], ['nw-node__ring nw-node__ring--outer', geometry.spread * geometry.outerRingScale]] as const) { const ring = svg<SVGCircleElement>('circle', className); set(ring, { cx: x, cy: y, r: radius }); visual.append(ring); }
  for (let index = 0; index < geometry.microMarks; index += 1) { const angle = random(index, 41) * Math.PI * 2; const mark = svg<SVGCircleElement>('circle', 'nw-node__mark'); set(mark, { cx: (x + Math.cos(angle) * geometry.spread * geometry.outerRingScale).toFixed(2), cy: (y + Math.sin(angle) * geometry.spread * geometry.outerRingScale).toFixed(2), r: .75 }); visual.append(mark); }
  const core = svg<SVGCircleElement>('circle', geometry.hub ? 'nw-node__core nw-node__core--hub' : 'nw-node__core'); set(core, { cx: x, cy: y, r: geometry.coreRadius }); visual.append(core);
  const labels = svg<SVGGElement>('g', 'nw-node__labels'); const label = svg<SVGTextElement>('text', 'nw-label nw-label--title'); set(label, { x: node.labelPosition.x, y: node.labelPosition.y, 'text-anchor': node.labelPosition.anchor }); label.textContent = node.label; labels.append(label);
  if (node.detail) { const detail = svg<SVGTextElement>('text', 'nw-label nw-label--detail'); set(detail, { x: node.labelPosition.x, y: node.labelPosition.y + 18, 'text-anchor': node.labelPosition.anchor }); detail.textContent = node.detail; labels.append(detail); }
  group.append(visual, labels); parent.append(group);
}

function appendConnection(parent: SVGGElement, defs: SVGDefsElement, connection: ResolvedConnection, nodes: Map<string, ResolvedNode>, unique: string, random: ReturnType<typeof createRandom>): { path: SVGPathElement; markers: SVGCircleElement[] } {
  const from = nodes.get(connection.from); const to = nodes.get(connection.to); if (!from || !to) throw new Error('Nodeweave: resolved connection has no nodes.');
  const edgeAnchors = anchors(from, to); const pathData = typeof connection.path === 'function' ? connection.path({ connection, from, to, anchors: edgeAnchors }) : connection.path ?? `M${edgeAnchors.start.x} ${edgeAnchors.start.y} L${edgeAnchors.end.x} ${edgeAnchors.end.y}`;
  const path = svg<SVGPathElement>('path', cssClass('nw-connection', connection.className)); path.dataset.nodeweaveConnection = connection.id;
  set(path, { d: pathData, 'stroke-width': connection.width, opacity: connection.opacity });
  if (connection.style === 'dashed') path.setAttribute('stroke-dasharray', '5 4'); if (connection.style === 'dotted') path.setAttribute('stroke-dasharray', '1 4');
  const startColor = connection.fromColor || connection.color || from.color; const endColor = connection.toColor || connection.color || to.color;
  if (startColor !== endColor) { const id = `nw-gradient-${unique}-${safeId(connection.id)}`; const gradient = svg<SVGLinearGradientElement>('linearGradient'); set(gradient, { id, gradientUnits: 'userSpaceOnUse', x1: from.position.x, y1: from.position.y, x2: to.position.x, y2: to.position.y }); const one = svg<SVGStopElement>('stop'); set(one, { offset: '0%', 'stop-color': startColor, 'stop-opacity': .72 }); const two = svg<SVGStopElement>('stop'); set(two, { offset: '100%', 'stop-color': endColor, 'stop-opacity': .5 }); gradient.append(one, two); defs.append(gradient); path.setAttribute('stroke', `url(#${id})`); } else path.setAttribute('stroke', startColor);
  parent.append(path);
  const markers: SVGCircleElement[] = []; const markerOptions = connection.markers;
  if (markerOptions) {
    const count = markerOptions.count ?? 4; const length = path.getTotalLength?.() ?? 0;
    for (let index = 0; index < count; index += 1) {
      const marker = svg<SVGCircleElement>('circle', 'nw-connection__marker'); const ratio = (index + 1) / (count + 1);
      const point = length && path.getPointAtLength ? path.getPointAtLength(length * ratio) : { x: edgeAnchors.start.x + ((edgeAnchors.end.x - edgeAnchors.start.x) * ratio), y: edgeAnchors.start.y + ((edgeAnchors.end.y - edgeAnchors.start.y) * ratio) };
      set(marker, { cx: point.x.toFixed(2), cy: point.y.toFixed(2), r: markerOptions.size ?? .75, fill: endColor, opacity: markerOptions.opacity ?? (.22 + random(index, 79) * .35) }); parent.append(marker); markers.push(marker);
    }
  }
  return { path, markers };
}

function appendAmbient(parent: SVGGElement, width: number, height: number, nodes: readonly ResolvedNode[], input: AmbientOptions | undefined): AmbientParticle[] {
  if (!input?.enabled) return [];
  const count = input.count ?? 300; const random = createRandom(input.seed); const colors = input.colors?.length ? input.colors : ['#43e2ff', '#4295ff', '#65e8aa', '#fbbd63', '#a88cff']; const dots: AmbientParticle[] = [];
  const hubs: readonly AmbientHub[] = input.hubs?.length ? input.hubs : nodes.map(({ position }) => ({ ...position }));
  const pointData: { x: number; y: number; color: string }[] = [];
  const excluded = (x: number, y: number): boolean => nodes.some((node) => Math.hypot(x - node.position.x, y - node.position.y) < node.geometry.spread * .42);
  for (let index = 0; pointData.length < count && index < count * 15; index += 1) {
    const hub = hubs[Math.floor(random(index, 3) * hubs.length)]!; const useHub = random(index, 2) < .58; const bias = hub.bias ?? 1;
    const x = useHub ? hub.x + (random(index, 5) - .5) * (260 + bias * 190) : 16 + random(index, 9) * (width - 32);
    const y = useHub ? hub.y + (random(index, 7) - .5) * (210 + bias * 170) : 16 + random(index, 11) * (height - 32);
    if (x < 12 || y < 12 || x > width - 12 || y > height - 12 || excluded(x, y)) continue;
    const radius = random(index, 23) < .74 ? .8 + random(index, 29) * .55 : 1.25 + random(index, 33) * .9; const opacity = (input.opacity ?? 1) * (.08 + random(index, 31) * .33);
    const dot = svg<SVGCircleElement>('circle', 'nw-ambient__dot'); set(dot, { cx: x.toFixed(2), cy: y.toFixed(2), r: radius.toFixed(2), fill: colors[Math.floor(random(index, 19) * colors.length)]!, opacity: opacity.toFixed(3) }); parent.append(dot); dots.push({ element: dot, x, y, amplitude: .3 + random(index, 61) * 1.2, phase: random(index, 67) * Math.PI * 2 }); pointData.push({ x, y, color: dot.getAttribute('fill')! });
  }
  const reach = input.reach ?? 38; const opacity = input.connectionOpacity ?? .07;
  for (let index = 0; index < pointData.length; index += 1) for (let other = index + 1; other < pointData.length; other += 1) { const a = pointData[index]!; const b = pointData[other]!; if (Math.hypot(a.x - b.x, a.y - b.y) > reach || random(index * 1000 + other, 41) > .11) continue; const path = svg<SVGPathElement>('path', 'nw-ambient__connection'); set(path, { d: `M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`, stroke: a.color, opacity }); parent.prepend(path); }
  return dots;
}

export class Nodeweave implements NodeweaveInstance {
  readonly element: SVGSVGElement; readonly nodes: readonly ResolvedNode[]; readonly connections: readonly ResolvedConnection[];
  #container: HTMLElement; #destroyed = false; #frame = 0; #timers = new Set<number>(); #observer?: IntersectionObserver; #visible = true; #ambient: AmbientParticle[] = []; #ambientEnabled = false; #paths: SVGPathElement[] = []; #markers: SVGCircleElement[] = []; #nodeElements: SVGGElement[] = []; #ambientElement?: SVGGElement; #options: NodeweaveOptions;
  constructor(container: HTMLElement, options: NodeweaveOptions) {
    if (!(container instanceof HTMLElement)) throw new TypeError('Nodeweave: mount requires an HTMLElement container.');
    this.#container = container; this.#options = options; this.nodes = resolveNodes(options); this.connections = resolveConnections(options.connections, this.nodes, options);
    const root = svg<SVGSVGElement>('svg', cssClass('nodeweave', options.className)); this.element = root; set(root, { viewBox: `0 0 ${options.width} ${options.height}`, role: options.ariaLabel ? 'img' : 'presentation', 'aria-label': options.ariaLabel });
    const defs = svg<SVGDefsElement>('defs'); const ambient = svg<SVGGElement>('g', 'nw-ambient'); const paths = svg<SVGGElement>('g', 'nw-connections'); const nodeGroup = svg<SVGGElement>('g', 'nw-nodes');
    this.#ambient = appendAmbient(ambient, options.width, options.height, this.nodes, options.ambient); this.#ambientElement = ambient;
    const nodeMap = new Map(this.nodes.map((node) => [node.id, node])); const unique = Math.random().toString(36).slice(2, 9); const random = createRandom(options.ambient?.seed);
    for (const connection of this.connections) { const rendered = appendConnection(paths, defs, connection, nodeMap, unique, random); this.#paths.push(rendered.path); this.#markers.push(...rendered.markers); }
    for (const node of this.nodes) { appendNode(nodeGroup, node, random); const nodeElement = nodeGroup.lastElementChild; if (nodeElement?.namespaceURI === SVG_NS && nodeElement.localName === 'g') this.#nodeElements.push(nodeElement as SVGGElement); }
    root.append(defs, ambient, paths, nodeGroup); container.replaceChildren(root); this.#installVisibility(); this.replay();
  }
  #reducedMotion(): boolean { return this.#options.animation?.respectReducedMotion !== false && typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  #installVisibility(): void { if (typeof IntersectionObserver === 'undefined') return; this.#observer = new IntersectionObserver(([entry]) => { this.#visible = entry?.isIntersecting ?? true; if (this.#visible) this.#startAmbient(); }, { threshold: .01 }); this.#observer.observe(this.element); }
  #startAmbient(): void { if (!this.#ambientEnabled || this.#frame || !this.#visible) return; const started = performance.now(); const tick = (time: number): void => { if (this.#destroyed || !this.#ambientEnabled || !this.#visible) { this.#frame = 0; return; } const speed = this.#options.ambient?.speed ?? .00065; for (const particle of this.#ambient) { const angle = (time - started) * speed + particle.phase; particle.element.setAttribute('cx', (particle.x + Math.cos(angle) * particle.amplitude).toFixed(2)); particle.element.setAttribute('cy', (particle.y + Math.sin(angle * 1.31) * particle.amplitude).toFixed(2)); } this.#frame = requestAnimationFrame(tick); }; this.#frame = requestAnimationFrame(tick); }
  replay(): void {
    if (this.#destroyed) throw new Error('Nodeweave: cannot replay a destroyed visualization.');
    for (const timer of this.#timers) window.clearTimeout(timer); this.#timers.clear();
    const animation = this.#options.animation ?? {}; const enabled = animation.enabled !== false && !this.#reducedMotion(); const duration = animation.duration ?? 560; const delay = animation.delay ?? 0; const stagger = animation.stagger ?? 100; const easing = animation.easing ?? 'cubic-bezier(.22,1,.36,1)';
    this.#ambientEnabled = Boolean(this.#options.ambient?.enabled && this.#options.ambient.movement && !this.#reducedMotion());
    if (!enabled) { this.#paths.forEach((path) => { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; path.style.opacity = ''; }); this.#markers.forEach((marker) => { marker.style.opacity = ''; }); this.#nodeElements.forEach((node) => { node.style.opacity = ''; node.style.transform = ''; node.classList.toggle('nw-node--pulse', Boolean(animation.nodePulse)); }); if (this.#ambientElement) this.#ambientElement.style.opacity = ''; this.#startAmbient(); return; }
    const revealConnections = animation.connectionReveal !== false; const revealNodes = animation.nodeReveal !== false; const revealAmbient = animation.ambientReveal !== false;
    this.#paths.forEach((path) => { if (!revealConnections) { path.style.strokeDasharray = ''; path.style.strokeDashoffset = ''; path.style.opacity = ''; return; } const length = path.getTotalLength?.() ?? 1000; path.style.transition = `stroke-dashoffset ${duration}ms ${easing}, opacity ${duration}ms ${easing}`; path.style.strokeDasharray = String(length); path.style.strokeDashoffset = String(length); path.style.opacity = '0'; });
    this.#markers.forEach((marker) => { marker.style.opacity = revealConnections ? '0' : ''; }); this.#nodeElements.forEach((node) => { if (!revealNodes) { node.style.opacity = ''; node.style.transform = ''; return; } node.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`; node.style.opacity = '0'; node.style.transform = 'scale(.72)'; }); if (this.#ambientElement) { if (revealAmbient) { this.#ambientElement.style.transition = `opacity ${duration}ms ${easing}`; this.#ambientElement.style.opacity = '0'; } else this.#ambientElement.style.opacity = ''; }
    const timer = window.setTimeout(() => { if (this.#destroyed) return; if (revealAmbient) this.#ambientElement && (this.#ambientElement.style.opacity = ''); this.#paths.forEach((path, index) => { const pathTimer = window.setTimeout(() => { if (revealConnections) { path.style.strokeDashoffset = '0'; path.style.opacity = ''; } }, index * stagger); this.#timers.add(pathTimer); }); this.#markers.forEach((marker, index) => { const markerTimer = window.setTimeout(() => { if (revealConnections) marker.style.opacity = ''; }, index * 16); this.#timers.add(markerTimer); }); this.#nodeElements.forEach((node, index) => { const nodeTimer = window.setTimeout(() => { if (revealNodes) { node.style.opacity = ''; node.style.transform = ''; } node.classList.toggle('nw-node--pulse', Boolean(animation.nodePulse)); }, index * stagger); this.#timers.add(nodeTimer); }); this.#startAmbient(); }, delay); this.#timers.add(timer);
  }
  resize(width: number, height: number): void { if (this.#destroyed) throw new Error('Nodeweave: cannot resize a destroyed visualization.'); if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new RangeError('Nodeweave: width and height must be positive finite numbers.'); this.element.setAttribute('viewBox', `0 0 ${width} ${height}`); }
  destroy(): void { if (this.#destroyed) return; this.#destroyed = true; if (this.#frame) cancelAnimationFrame(this.#frame); for (const timer of this.#timers) window.clearTimeout(timer); this.#timers.clear(); this.#observer?.disconnect(); if (this.#container.contains(this.element)) this.#container.replaceChildren(); }
}
