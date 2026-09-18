import { afterEach, describe, expect, it, vi } from 'vitest';
import { Nodeweave, createRandom, resolveBuildSequence, resolveConnections, resolveNodes } from '../src/index.js';
import type { NodeweaveOptions } from '../src/index.js';

const base: NodeweaveOptions = {
  width: 400, height: 240,
  nodes: [
    { id: 'one', label: 'One', position: { x: 40, y: 60 }, color: '#f00' },
    { id: 'two', label: 'Two', detail: 'A detail', position: { x: 280, y: 160 }, color: '#0ff' },
  ],
  connections: [{ from: 'one', to: 'two' }],
};

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

describe('configuration resolution', () => {
  it('resolves useful defaults and automatic connection identifiers', () => {
    const nodes = resolveNodes(base); const connections = resolveConnections(base.connections, nodes, base);
    expect(nodes[0]?.geometry.spread).toBe(24); expect(nodes[0]?.labelPosition).toEqual({ x: 80, y: 56, anchor: 'start' });
    expect(connections[0]).toMatchObject({ id: 'one-two-0', opacity: .72, width: 1, style: 'solid' });
  });
  it('rejects duplicate IDs, invalid numeric values, and missing references', () => {
    expect(() => resolveNodes({ ...base, nodes: [base.nodes[0]!, base.nodes[0]!] })).toThrow('duplicate node id');
    expect(() => resolveNodes({ ...base, width: Number.NaN })).toThrow('finite number');
    expect(() => resolveConnections([{ from: 'one', to: 'missing' }], resolveNodes(base), base)).toThrow('unknown node');
  });
  it('has deterministic seed generation', () => {
    const first = createRandom('same'); const second = createRandom('same'); const other = createRandom('other');
    expect([0, 1, 2].map((index) => first(index, 7))).toEqual([0, 1, 2].map((index) => second(index, 7)));
    expect(first(3)).not.toBe(other(3));
  });
  it('validates complete explicit build sequences', () => {
    const nodes = resolveNodes(base);
    expect(resolveBuildSequence(['two', 'one'], nodes)).toEqual(['two', 'one']);
    expect(() => resolveBuildSequence(['one'], nodes)).toThrow('every node');
    expect(() => resolveBuildSequence(['one', 'one'], nodes)).toThrow('duplicate');
    expect(() => resolveBuildSequence(['one', 'missing'], nodes)).toThrow('unknown');
  });
});

function pointer(type: string, x: number, y: number, pointerId = 1): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y }, pointerId: { value: pointerId }, pointerType: { value: 'mouse' }, button: { value: 0 } });
  return event;
}

describe('runtime layout and dragging', () => {
  it('keeps configuration immutable while updating node-owned groups and affected connections', () => {
    const input = structuredClone(base); const container = document.body.appendChild(document.createElement('div'));
    const network = new Nodeweave(container, { ...input, animation: { enabled: false }, interaction: { drag: { enabled: true } } });
    const connection = container.querySelector<SVGPathElement>('[data-nodeweave-connection]')!; const before = connection.getAttribute('d');
    network.setLayout({ one: { x: 120, y: 100 } });
    expect(input.nodes[0]?.position).toEqual({ x: 40, y: 60 }); expect(network.getLayout().one).toEqual({ x: 120, y: 100 });
    expect(container.querySelector<SVGGElement>('[data-nodeweave-node="one"]')?.getAttribute('transform')).toBe('translate(80.00 40.00)');
    expect(container.querySelector<SVGGElement>('[data-nodeweave-node="one"] .nw-node__labels')).not.toBeNull(); expect(connection.getAttribute('d')).not.toBe(before);
    network.resetLayout(); expect(network.getLayout().one).toEqual({ x: 40, y: 60 }); network.destroy();
  });
  it('supports partial layouts and rejects invalid layout changes', () => {
    const container = document.body.appendChild(document.createElement('div')); const network = new Nodeweave(container, { ...base, animation: { enabled: false } });
    network.setLayout({ two: { x: 300, y: 200 } }); expect(network.getLayout().one).toEqual({ x: 40, y: 60 });
    expect(() => network.setLayout({ missing: { x: 0, y: 0 } })).toThrow('unknown node'); expect(() => network.setLayout({ one: { x: Number.NaN, y: 0 } })).toThrow('finite'); network.destroy();
  });
  it('uses pointer events, honors per-node overrides and reports semantic drag events', () => {
    const events: string[] = []; const container = document.body.appendChild(document.createElement('div'));
    const network = new Nodeweave(container, { ...base, nodes: [{ ...base.nodes[0]!, draggable: false }, base.nodes[1]!], animation: { enabled: false }, interaction: { drag: { enabled: true, onStart: ({ id }) => events.push(`start:${id}`), onMove: ({ id }) => events.push(`move:${id}`), onEnd: ({ id }) => events.push(`end:${id}`) } } });
    const blocked = container.querySelector<SVGRectElement>('[data-nodeweave-hit="one"]')!; blocked.dispatchEvent(pointer('pointerdown', 40, 60)); blocked.dispatchEvent(pointer('pointermove', 120, 100)); expect(network.getLayout().one).toEqual({ x: 40, y: 60 });
    const hit = container.querySelector<SVGRectElement>('[data-nodeweave-hit="two"]')!; hit.dispatchEvent(pointer('pointerdown', 280, 160, 2)); hit.dispatchEvent(pointer('pointermove', 320, 180, 2)); hit.dispatchEvent(pointer('pointerup', 320, 180, 2)); expect(network.getLayout().two).toEqual({ x: 320, y: 180 }); expect(events).toEqual(['start:two', 'move:two', 'end:two']); network.destroy();
  });
  it('clamps pointer movement to the SVG bounds by default', () => {
    const container = document.body.appendChild(document.createElement('div')); const network = new Nodeweave(container, { ...base, animation: { enabled: false }, interaction: { drag: { enabled: true } } }); const hit = container.querySelector<SVGRectElement>('[data-nodeweave-hit="one"]')!;
    hit.dispatchEvent(pointer('pointerdown', 40, 60)); hit.dispatchEvent(pointer('pointermove', 900, 900)); hit.dispatchEvent(pointer('pointerup', 900, 900)); expect(network.getLayout().one).toEqual({ x: 400, y: 240 }); network.destroy();
  });
});

describe('progressive build coordination', () => {
  it('suspends drag during construction, then restores it without changing runtime layout on replay', () => {
    vi.useFakeTimers(); const container = document.body.appendChild(document.createElement('div'));
    const network = new Nodeweave(container, { ...base, animation: { enabled: true, duration: 20, stagger: 10, build: { sequence: ['two', 'one'], labels: { delay: 5 }, connections: { duration: 20 } } }, interaction: { drag: { enabled: true } } });
    const hit = container.querySelector<SVGRectElement>('[data-nodeweave-hit="one"]')!; hit.dispatchEvent(pointer('pointerdown', 40, 60)); hit.dispatchEvent(pointer('pointermove', 100, 80)); expect(network.getLayout().one).toEqual({ x: 40, y: 60 });
    vi.advanceTimersByTime(100); hit.dispatchEvent(pointer('pointerdown', 40, 60)); hit.dispatchEvent(pointer('pointermove', 100, 80)); hit.dispatchEvent(pointer('pointerup', 100, 80)); expect(network.getLayout().one).toEqual({ x: 100, y: 80 });
    network.replay(); expect(network.getLayout().one).toEqual({ x: 100, y: 80 }); network.destroy(); vi.useRealTimers();
  });
  it('cleans active build interaction handlers on destroy', () => {
    vi.useFakeTimers(); const container = document.body.appendChild(document.createElement('div')); const network = new Nodeweave(container, { ...base, animation: { enabled: true, duration: 50 }, interaction: { drag: { enabled: true } } }); const hit = container.querySelector<SVGRectElement>('[data-nodeweave-hit="one"]')!; network.destroy(); vi.advanceTimersByTime(100); hit.dispatchEvent(pointer('pointerdown', 40, 60)); expect(container.children).toHaveLength(0); vi.useRealTimers();
  });
  it('supports fade and draw connection build effects', () => {
    vi.useFakeTimers(); const container = document.body.appendChild(document.createElement('div')); const draw = new Nodeweave(container, { ...base, animation: { enabled: true, duration: 20, build: { connections: { effect: 'draw' } } } }); expect(container.querySelector<SVGPathElement>('.nw-connection')?.style.strokeDashoffset).not.toBe(''); draw.destroy();
    const fadeContainer = document.body.appendChild(document.createElement('div')); const fade = new Nodeweave(fadeContainer, { ...base, animation: { enabled: true, duration: 20, build: { connections: { effect: 'fade' } } } }); expect(fadeContainer.querySelector<SVGPathElement>('.nw-connection')?.style.strokeDashoffset).toBe(''); fade.destroy(); vi.useRealTimers();
  });
});

describe('runtime customization', () => {
  it('updates node content, appearance, and generic typography without replacing the SVG', () => {
    const container = document.body.appendChild(document.createElement('div')); const network = new Nodeweave(container, { ...base, animation: { enabled: false } }); const element = network.element;
    network.updateTypography({ labelSize: 18, detailSize: '.8rem' }); network.updateNode('one', { label: 'Renamed', detail: 'Updated', color: '#00ff00', opacity: .5, geometry: { coreRadius: 8 } });
    expect(network.element).toBe(element); expect(container.textContent).toContain('Renamed'); expect(container.textContent).toContain('Updated'); expect(network.element.style.getPropertyValue('--nodeweave-title-size')).toBe('18px'); expect(container.querySelector('[data-nodeweave-node="one"]')?.getAttribute('style')).toContain('rgb(0, 255, 0)'); network.destroy();
  });
  it('updates connection, ambient, animation, and interaction configuration safely', () => {
    const container = document.body.appendChild(document.createElement('div')); const network = new Nodeweave(container, { ...base, ambient: { enabled: true, count: 3 }, animation: { enabled: false } });
    network.updateConnection('one-two-0', { width: 3, opacity: .4, color: '#fff' }); expect(container.querySelector<SVGPathElement>('.nw-connection')?.getAttribute('stroke-width')).toBe('3');
    network.updateAmbient({ enabled: true, count: 7, seed: 'new' }); expect(container.querySelectorAll('.nw-ambient__dot')).toHaveLength(7);
    network.updateAnimation({ duration: 100, build: { sequence: ['two', 'one'] } }); network.updateInteraction({ drag: { enabled: true, bounds: 'none' } }); expect(network.element.dataset.nodeweaveDrag).toBe('ready'); network.destroy();
  });
});

describe('mount and lifecycle', () => {
  it('renders generic SVG nodes, connections, labels, and ambient dots', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const instance = new Nodeweave(container, { ...base, ambient: { enabled: true, count: 12, seed: 'test' }, animation: { enabled: false } });
    expect(container.querySelector('svg.nodeweave')).toBe(instance.element);
    expect(container.querySelectorAll('[data-nodeweave-node]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-nodeweave-connection]')).toHaveLength(1);
    expect(container.querySelectorAll('.nw-ambient__dot')).toHaveLength(12);
    expect(container.textContent).toContain('A detail');
  });
  it('renders optional per-connection markers', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const instance = new Nodeweave(container, { ...base, connections: [{ from: 'one', to: 'two', markers: { count: 3 } }], animation: { enabled: false } });
    expect(container.querySelectorAll('.nw-connection__marker')).toHaveLength(3); instance.destroy();
  });
  it('keeps ambient output deterministic and cleans all owned DOM on destroy', () => {
    const firstContainer = document.body.appendChild(document.createElement('div')); const secondContainer = document.body.appendChild(document.createElement('div'));
    const options = { ...base, ambient: { enabled: true, count: 8, seed: 'repeat' }, animation: { enabled: false } };
    const first = new Nodeweave(firstContainer, options); const second = new Nodeweave(secondContainer, options);
    const coordinates = (container: HTMLElement) => [...container.querySelectorAll<SVGCircleElement>('.nw-ambient__dot')].map((dot) => `${dot.getAttribute('cx')}:${dot.getAttribute('cy')}`);
    expect(coordinates(firstContainer)).toEqual(coordinates(secondContainer)); first.destroy(); expect(firstContainer.children).toHaveLength(0); expect(() => first.replay()).toThrow('destroyed'); second.destroy();
  });
  it('bypasses intro styles when animation is disabled or reduced motion is active', () => {
    const container = document.body.appendChild(document.createElement('div')); vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const instance = new Nodeweave(container, { ...base, animation: { enabled: true, respectReducedMotion: true } });
    const path = container.querySelector<SVGPathElement>('.nw-connection')!; expect(path.style.strokeDashoffset).toBe(''); instance.resize(600, 300); expect(instance.element.getAttribute('viewBox')).toBe('0 0 600 300'); instance.destroy();
  });
  it('replays without remounting or duplicating the owned SVG', () => {
    const container = document.body.appendChild(document.createElement('div'));
    const instance = new Nodeweave(container, { ...base, animation: { enabled: false } });
    instance.replay(); expect(container.querySelectorAll('svg.nodeweave')).toHaveLength(1); instance.destroy();
  });
});

describe('public API', () => {
  it('exposes the intended constructor and helpers', () => { expect(Nodeweave).toBeTypeOf('function'); expect(resolveNodes).toBeTypeOf('function'); expect(resolveBuildSequence).toBeTypeOf('function'); });
});
