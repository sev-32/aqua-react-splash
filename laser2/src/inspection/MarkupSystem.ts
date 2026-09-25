import type { AppContext, AppSystem } from '../core/System.js';

export type MarkupTool = 'none' | 'pen' | 'arrow' | 'rect' | 'erase';

interface Point { x: number; y: number }
interface Stroke { tool: Exclude<MarkupTool, 'none' | 'erase'>; color: string; width: number; points: Point[] }

export class MarkupSystem implements AppSystem {
  readonly id = 'inspection.markup';
  readonly phase = 'ui' as const;
  enabled = true;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private context: AppContext | null = null;
  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  tool: MarkupTool = 'none';
  color = '#ff4d3f';
  width = 3;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'foundry-markup-canvas';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
  }

  init(context: AppContext): void {
    this.context = context;
    document.body.appendChild(this.canvas);
    this.resize();
    addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', (event) => this.begin(event));
    this.canvas.addEventListener('pointermove', (event) => this.move(event));
    this.canvas.addEventListener('pointerup', (event) => this.end(event));
    this.canvas.addEventListener('pointercancel', (event) => this.end(event));
    this.updatePointerMode();
  }

  setTool(tool: MarkupTool): void {
    this.tool = tool;
    this.updatePointerMode();
  }

  undo(): void { this.strokes.pop(); this.draw(); }
  clear(): void { this.strokes = []; this.draw(); }

  private updatePointerMode(): void {
    this.canvas.style.pointerEvents = this.tool === 'none' ? 'none' : 'auto';
  }

  private resize(): void {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.canvas.style.width = `${innerWidth}px`;
    this.canvas.style.height = `${innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private point(event: PointerEvent): Point { return { x: event.clientX, y: event.clientY }; }

  private begin(event: PointerEvent): void {
    if (this.tool === 'none') return;
    if (this.tool === 'erase') {
      const p = this.point(event);
      this.strokes = this.strokes.filter((stroke) => !stroke.points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 18));
      this.draw();
      return;
    }
    this.current = { tool: this.tool, color: this.color, width: this.width, points: [this.point(event)] } as Stroke;
    this.canvas.setPointerCapture(event.pointerId);
  }

  private move(event: PointerEvent): void {
    if (!this.current) return;
    const p = this.point(event);
    if (this.current.tool === 'pen') this.current.points.push(p);
    else if (this.current.points.length === 1) this.current.points.push(p);
    else this.current.points[1] = p;
    this.draw();
  }

  private end(event: PointerEvent): void {
    if (!this.current) return;
    if (this.current.points.length === 1) this.current.points.push(this.point(event));
    this.strokes.push(this.current);
    this.current = null;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.draw();
  }

  private drawStroke(stroke: Stroke): void {
    const points = stroke.points;
    if (points.length < 2) return;
    this.ctx.strokeStyle = stroke.color;
    this.ctx.fillStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    if (stroke.tool === 'pen') {
      this.ctx.moveTo(points[0]!.x, points[0]!.y);
      for (const point of points.slice(1)) this.ctx.lineTo(point.x, point.y);
      this.ctx.stroke();
    } else if (stroke.tool === 'rect') {
      const a = points[0]!, b = points.at(-1)!;
      this.ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (stroke.tool === 'arrow') {
      const a = points[0]!, b = points.at(-1)!;
      this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const size = 10 + stroke.width * 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(b.x, b.y);
      this.ctx.lineTo(b.x - Math.cos(angle - 0.5) * size, b.y - Math.sin(angle - 0.5) * size);
      this.ctx.lineTo(b.x - Math.cos(angle + 0.5) * size, b.y - Math.sin(angle + 0.5) * size);
      this.ctx.closePath(); this.ctx.fill();
    }
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const stroke of this.strokes) this.drawStroke(stroke);
    if (this.current) this.drawStroke(this.current);
    this.context?.requestRender('markup changed');
  }

  telemetry(): Record<string, unknown> { return { strokes: this.strokes.length, tool: this.tool }; }
}
