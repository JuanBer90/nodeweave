/** A point in the SVG coordinate system. */
export type Point = { x: number; y: number };

export type LabelPosition = Point & { anchor?: 'start' | 'middle' | 'end' };

export type NodeGeometry = {
  coreRadius?: number;
  spread?: number;
  particleCount?: number;
  innerRingScale?: number;
  outerRingScale?: number;
  microMarks?: number;
  hub?: boolean;
};

export type NodeDefinition<TMeta = unknown> = {
  id: string;
  label: string;
  detail?: string;
  position: Point;
  labelPosition?: LabelPosition;
  color?: string;
  opacity?: number;
  geometry?: NodeGeometry;
  className?: string;
  metadata?: TMeta;
  /** Overrides global dragging for this node when interaction.drag is enabled. */
  draggable?: boolean;
};

export type ResolvedNode<TMeta = unknown> = Omit<NodeDefinition<TMeta>, 'geometry'> & {
  color: string;
  opacity: number;
  geometry: Required<NodeGeometry>;
  labelPosition: Required<LabelPosition>;
};

export type ConnectionStyle = 'solid' | 'dashed' | 'dotted';
export type ConnectionMarkers = { count?: number; size?: number; opacity?: number };

export type ConnectionPathContext = {
  connection: ResolvedConnection;
  from: ResolvedNode;
  to: ResolvedNode;
  anchors: { start: Point; end: Point };
};

export type ConnectionDefinition = {
  id?: string;
  from: string;
  to: string;
  color?: string;
  fromColor?: string;
  toColor?: string;
  opacity?: number;
  width?: number;
  style?: ConnectionStyle;
  markers?: ConnectionMarkers;
  path?: string | ((context: ConnectionPathContext) => string);
  className?: string;
};

export type ResolvedConnection = { id: string; from: string; to: string; color: string; fromColor: string; toColor: string; opacity: number; width: number; style: ConnectionStyle } & Pick<ConnectionDefinition, 'path' | 'className' | 'markers'>;

export type AmbientHub = Point & { bias?: number };
export type AmbientOptions = {
  enabled?: boolean;
  count?: number;
  colors?: readonly string[];
  opacity?: number;
  connectionOpacity?: number;
  reach?: number;
  hubs?: readonly AmbientHub[];
  seed?: number | string;
  movement?: boolean;
  speed?: number;
};

export type AnimationOptions = {
  enabled?: boolean;
  respectReducedMotion?: boolean;
  duration?: number;
  delay?: number;
  stagger?: number;
  easing?: string;
  nodeReveal?: boolean;
  connectionReveal?: boolean;
  ambientReveal?: boolean;
  nodePulse?: boolean;
  /** Configures the progressive construction sequence. */
  build?: BuildAnimationOptions;
};

export type BuildEffect = 'fade' | 'scale' | 'fade-scale';
export type BuildPartOptions = { effect?: BuildEffect; duration?: number; delay?: number };
export type ConnectionBuildOptions = Omit<BuildPartOptions, 'effect'> & { effect?: 'fade' | 'draw'; sequence?: readonly string[] };
export type BuildAnimationOptions = {
  /** Exact node order. When supplied it must contain every node exactly once. */
  sequence?: readonly string[];
  geometry?: BuildPartOptions;
  labels?: BuildPartOptions;
  connections?: ConnectionBuildOptions;
  ambient?: BuildPartOptions;
};

export type DragBounds = 'container' | 'none';
export type LayoutChange = { id: string; position: Point; previousPosition: Point; pointerType?: string };
export type DragOptions = {
  enabled?: boolean;
  bounds?: DragBounds;
  onStart?: (change: LayoutChange) => void;
  onMove?: (change: LayoutChange) => void;
  onEnd?: (change: LayoutChange) => void;
};
export type InteractionOptions = { drag?: DragOptions };

export type NodeweaveOptions = {
  width: number;
  height: number;
  nodes: readonly NodeDefinition[];
  connections?: readonly ConnectionDefinition[];
  nodeDefaults?: Omit<Partial<ResolvedNode>, 'id' | 'label' | 'position' | 'labelPosition' | 'geometry'> & { geometry?: NodeGeometry };
  connectionDefaults?: Partial<Omit<ResolvedConnection, 'id' | 'from' | 'to' | 'path' | 'className'>>;
  ambient?: AmbientOptions;
  animation?: AnimationOptions;
  interaction?: InteractionOptions;
  className?: string;
  ariaLabel?: string;
};

export type NodeweaveInstance = {
  readonly element: SVGSVGElement;
  readonly nodes: readonly ResolvedNode[];
  readonly connections: readonly ResolvedConnection[];
  getLayout(): Readonly<Record<string, Point>>;
  setLayout(layout: Readonly<Record<string, Point>>): void;
  resetLayout(): void;
  replay(): void;
  resize(width: number, height: number): void;
  destroy(): void;
};
