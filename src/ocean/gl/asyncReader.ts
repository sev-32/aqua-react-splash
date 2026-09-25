/**
 * Non-blocking GPU→CPU readback (PIXEL_PACK_BUFFER + fence). Reductions are
 * small (≤ 64²), so 1–2 frames of latency is the only cost — no pipeline stall.
 */
import type { GL } from './context';

export class AsyncReader {
  private pbo: WebGLBuffer;
  private fence: WebGLSync | null = null;
  readonly data: Float32Array;
  private pending = false;
  /** Frame counter of the last completed read. */
  version = 0;

  constructor(private gl: GL, readonly width: number, readonly height: number, readonly attachments: number) {
    this.data = new Float32Array(width * height * 4 * attachments);
    this.pbo = gl.createBuffer()!;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, this.data.byteLength, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
  }

  get busy() {
    return this.pending;
  }

  /** Queue a read of all colour attachments of `fbo` (must be bound-compatible RGBA32F). */
  request(fbo: WebGLFramebuffer) {
    if (this.pending) return false;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    const bytes = this.width * this.height * 16;
    for (let a = 0; a < this.attachments; a++) {
      gl.readBuffer(gl.COLOR_ATTACHMENT0 + a);
      gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, a * bytes);
    }
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    this.pending = true;
    return true;
  }

  /** Returns true when new data landed in `data`. */
  poll(): boolean {
    if (!this.pending || !this.fence) return false;
    const gl = this.gl;
    const st = gl.clientWaitSync(this.fence, 0, 0);
    if (st === gl.TIMEOUT_EXPIRED || st === gl.WAIT_FAILED) return false;
    gl.deleteSync(this.fence);
    this.fence = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.data);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.pending = false;
    this.version++;
    return true;
  }

  dispose() {
    const gl = this.gl;
    if (this.fence) gl.deleteSync(this.fence);
    gl.deleteBuffer(this.pbo);
  }
}
