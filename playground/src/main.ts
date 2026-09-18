import { Nodeweave, type ConnectionPathContext, type NodeweaveOptions } from 'nodeweave';
import 'nodeweave/styles.css';
import './style.css';

const node = (id: string) => (context: ConnectionPathContext) => context.connection.id === id;
const curve = (id: string, render: (context: ConnectionPathContext) => string) => (context: ConnectionPathContext): string => node(id)(context) ? render(context) : '';

/** Consumer-owned Dexstoore desktop scene. Nodeweave itself has no knowledge of it. */
const dexstoore: NodeweaveOptions = {
  width: 960,
  height: 720,
  ariaLabel: 'Dexstoore connected systems',
  nodeDefaults: { geometry: { innerRingScale: .52, outerRingScale: .94 } },
  nodes: [
    { id: 'storefront', label: 'Storefront', detail: 'Browse · Checkout · Purchase', position: { x: 392, y: 88 }, labelPosition: { x: 434, y: 84 }, color: 'var(--orange)', geometry: { coreRadius: 4.16, spread: 28.6, particleCount: 55, innerRingScale: .5928, outerRingScale: 1.0716, microMarks: 5 } },
    { id: 'commerce-api', label: 'Commerce API', detail: 'Products · Orders · Customers', position: { x: 404, y: 206 }, labelPosition: { x: 446, y: 202 }, color: 'var(--cyan)', geometry: { coreRadius: 4.68, spread: 35.1, particleCount: 76, innerRingScale: .57, outerRingScale: 1.0944, microMarks: 6 } },
    { id: 'order-engine', label: 'Order Engine', detail: 'Processing · Assignment · Fulfillment', position: { x: 388, y: 334 }, labelPosition: { x: 430, y: 330 }, color: 'var(--violet)', geometry: { coreRadius: 5.46, spread: 46.8, particleCount: 114, innerRingScale: .5472, outerRingScale: 1.1628, microMarks: 8, hub: true } },
    { id: 'operations', label: 'Operations', detail: 'Manage · Support · Scale', position: { x: 108, y: 498 }, labelPosition: { x: 150, y: 494 }, color: 'var(--green)', geometry: { coreRadius: 3.64, spread: 24.7, particleCount: 47, innerRingScale: .6156, outerRingScale: 1.026, microMarks: 4 } },
    { id: 'fulfillment', label: 'Fulfillment', detail: 'Automated Delivery', position: { x: 648, y: 486 }, labelPosition: { x: 690, y: 482 }, color: 'var(--blue)', geometry: { coreRadius: 4.42, spread: 32.5, particleCount: 70, innerRingScale: .5814, outerRingScale: 1.083, microMarks: 6 } },
    { id: 'email', label: 'Email', detail: 'Delivery · Receipts', position: { x: 528, y: 628 }, labelPosition: { x: 570, y: 624 }, color: 'var(--red)', geometry: { coreRadius: 3.12, spread: 18.2, particleCount: 32, innerRingScale: .6384, outerRingScale: 1.0032, microMarks: 3 } },
    { id: 'whatsapp', label: 'WhatsApp', detail: 'Twilio Integration', position: { x: 752, y: 618 }, labelPosition: { x: 794, y: 614 }, color: 'var(--yellow)', geometry: { coreRadius: 3.12, spread: 18.2, particleCount: 32, innerRingScale: .6384, outerRingScale: 1.0032, microMarks: 3 } },
  ],
  connections: [
    { id: 'storefront-commerce-api', from: 'storefront', to: 'commerce-api', fromColor: 'var(--orange)', toColor: 'var(--cyan)', markers: {} },
    { id: 'commerce-api-order-engine', from: 'commerce-api', to: 'order-engine', fromColor: 'var(--cyan)', toColor: 'var(--violet)', markers: {} },
    { id: 'order-engine-operations', from: 'order-engine', to: 'operations', fromColor: 'var(--violet)', toColor: 'var(--green)', markers: {}, path: curve('order-engine-operations', ({ anchors: a }) => `M${a.start.x} ${a.start.y} C${a.start.x - 140} ${a.start.y + 70} ${a.end.x + 50} ${a.end.y - 110} ${a.end.x} ${a.end.y}`) },
    { id: 'order-engine-fulfillment', from: 'order-engine', to: 'fulfillment', fromColor: 'var(--violet)', toColor: 'var(--blue)', markers: {}, path: curve('order-engine-fulfillment', ({ anchors: a }) => `M${a.start.x} ${a.start.y} C${a.start.x + 130} ${a.start.y + 60} ${a.end.x - 60} ${a.end.y - 100} ${a.end.x} ${a.end.y}`) },
    { id: 'fulfillment-email', from: 'fulfillment', to: 'email', fromColor: 'var(--blue)', toColor: 'var(--red)', markers: {}, path: curve('fulfillment-email', ({ from, to, anchors: a }) => { const x = a.start.x - 4; return `M${x} ${a.start.y} C${x - 70} ${a.start.y + 55} ${a.end.x + 10} ${a.end.y - 55} ${a.end.x} ${a.end.y}`; }) },
    { id: 'fulfillment-whatsapp', from: 'fulfillment', to: 'whatsapp', fromColor: 'var(--blue)', toColor: 'var(--yellow)', markers: {}, path: curve('fulfillment-whatsapp', ({ from, to, anchors: a }) => `M${a.start.x} ${a.start.y} C${from.position.x + 55} ${from.position.y + 95} ${to.position.x - 25} ${to.position.y - 70} ${a.end.x} ${a.end.y}`) },
  ],
  ambient: { enabled: true, count: 1280, colors: ['var(--cyan)', 'var(--blue)', 'var(--cyan)', 'var(--green)', 'var(--orange)', 'var(--violet)', 'var(--red)', 'var(--yellow)'], opacity: 1, connectionOpacity: .07, reach: 38, seed: 'dexstoore', movement: true, speed: .00065, hubs: [{ x: 404, y: 206, bias: 1.05 }, { x: 388, y: 334, bias: 1.35 }, { x: 108, y: 498, bias: 1 }, { x: 648, y: 486, bias: 1.08 }] },
  animation: { enabled: true, duration: 560, stagger: 100, easing: 'cubic-bezier(.22,1,.36,1)', nodeReveal: true, connectionReveal: true, ambientReveal: true, respectReducedMotion: true },
};

new Nodeweave(document.querySelector<HTMLElement>('#scene')!, dexstoore);
