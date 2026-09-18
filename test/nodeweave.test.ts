import { afterEach, describe, expect, it, vi } from 'vitest';
import { Nodeweave, createRandom, resolveConnections, resolveNodes } from '../src/index.js';
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
  it('exposes the intended constructor and helpers', () => { expect(Nodeweave).toBeTypeOf('function'); expect(resolveNodes).toBeTypeOf('function'); });
});
