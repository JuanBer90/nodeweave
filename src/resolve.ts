import type { ConnectionDefinition, NodeDefinition, NodeweaveOptions, ResolvedConnection, ResolvedNode } from './types.js';

const geometry = { coreRadius: 3.5, spread: 24, particleCount: 40, innerRingScale: 0.52, outerRingScale: 0.94, microMarks: 5, hub: false };

function finite(value: number | undefined, name: string, fallback?: number): number {
  const resolved = value ?? fallback;
  if (resolved === undefined || !Number.isFinite(resolved)) throw new TypeError(`Nodeweave: ${name} must be a finite number.`);
  return resolved;
}

function positive(value: number | undefined, name: string, fallback?: number): number {
  const resolved = finite(value, name, fallback);
  if (resolved < 0) throw new RangeError(`Nodeweave: ${name} cannot be negative.`);
  return resolved;
}

export function resolveNodes(options: NodeweaveOptions): ResolvedNode[] {
  positive(options.width, 'width'); positive(options.height, 'height');
  const ids = new Set<string>();
  return options.nodes.map((node, index) => {
    if (!node.id) throw new TypeError(`Nodeweave: node at index ${index} needs a non-empty id.`);
    if (ids.has(node.id)) throw new Error(`Nodeweave: duplicate node id "${node.id}".`);
    ids.add(node.id);
    finite(node.position.x, `node "${node.id}" position.x`); finite(node.position.y, `node "${node.id}" position.y`);
    const inputGeometry = { ...options.nodeDefaults?.geometry, ...node.geometry };
    return {
      ...node,
      color: node.color ?? options.nodeDefaults?.color ?? 'currentColor',
      opacity: positive(node.opacity, `node "${node.id}" opacity`, options.nodeDefaults?.opacity ?? 1),
      geometry: {
        coreRadius: positive(inputGeometry.coreRadius, `node "${node.id}" coreRadius`, geometry.coreRadius),
        spread: positive(inputGeometry.spread, `node "${node.id}" spread`, geometry.spread),
        particleCount: Math.round(positive(inputGeometry.particleCount, `node "${node.id}" particleCount`, geometry.particleCount)),
        innerRingScale: positive(inputGeometry.innerRingScale, `node "${node.id}" innerRingScale`, geometry.innerRingScale),
        outerRingScale: positive(inputGeometry.outerRingScale, `node "${node.id}" outerRingScale`, geometry.outerRingScale),
        microMarks: Math.round(positive(inputGeometry.microMarks, `node "${node.id}" microMarks`, geometry.microMarks)),
        hub: inputGeometry.hub ?? geometry.hub,
      },
      labelPosition: { x: node.labelPosition?.x ?? node.position.x + 40, y: node.labelPosition?.y ?? node.position.y - 4, anchor: node.labelPosition?.anchor ?? 'start' },
    };
  });
}

export function resolveConnections(definitions: readonly ConnectionDefinition[] = [], nodes: readonly ResolvedNode[], options: NodeweaveOptions): ResolvedConnection[] {
  const nodeIds = new Set(nodes.map((node) => node.id)); const ids = new Set<string>();
  return definitions.map((connection, index) => {
    if (!nodeIds.has(connection.from) || !nodeIds.has(connection.to)) throw new Error(`Nodeweave: connection "${connection.id ?? index}" references an unknown node.`);
    const id = connection.id ?? `${connection.from}-${connection.to}-${index}`;
    if (ids.has(id)) throw new Error(`Nodeweave: duplicate connection id "${id}".`); ids.add(id);
    const resolved: ResolvedConnection = { id, from: connection.from, to: connection.to, color: connection.color ?? options.connectionDefaults?.color ?? '', fromColor: connection.fromColor ?? '', toColor: connection.toColor ?? '', opacity: positive(connection.opacity, `connection "${id}" opacity`, options.connectionDefaults?.opacity ?? 0.72), width: positive(connection.width, `connection "${id}" width`, options.connectionDefaults?.width ?? 1), style: connection.style ?? options.connectionDefaults?.style ?? 'solid' };
    if (connection.path !== undefined) resolved.path = connection.path;
    if (connection.className !== undefined) resolved.className = connection.className;
    if (connection.markers !== undefined) resolved.markers = connection.markers;
    return resolved;
  });
}

export function anchors(from: ResolvedNode, to: ResolvedNode): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const dx = to.position.x - from.position.x; const dy = to.position.y - from.position.y;
  const fromReach = from.geometry.spread * 0.42; const toReach = to.geometry.spread * 0.42;
  if (Math.abs(dy) >= Math.abs(dx)) return dy >= 0 ? { start: { x: from.position.x, y: from.position.y + fromReach }, end: { x: to.position.x, y: to.position.y - toReach } } : { start: { x: from.position.x, y: from.position.y - fromReach }, end: { x: to.position.x, y: to.position.y + toReach } };
  return dx >= 0 ? { start: { x: from.position.x + fromReach, y: from.position.y }, end: { x: to.position.x - toReach, y: to.position.y } } : { start: { x: from.position.x - fromReach, y: from.position.y }, end: { x: to.position.x + toReach, y: to.position.y } };
}
