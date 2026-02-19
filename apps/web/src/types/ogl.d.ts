declare module "ogl" {
  export class Color {
    constructor(...args: Array<unknown>);
    r: number;
    g: number;
    b: number;
  }

  export class Mesh {
    constructor(...args: Array<unknown>);
  }

  export class Program {
    constructor(...args: Array<unknown>);
    uniforms: Record<string, { value: unknown }>;
  }

  export class Renderer {
    constructor(...args: Array<unknown>);
    gl: WebGLRenderingContext & { canvas: HTMLCanvasElement };
    setSize(width: number, height: number): void;
    render(options: Record<string, unknown>): void;
  }

  export class Triangle {
    constructor(...args: Array<unknown>);
    attributes: Record<string, unknown>;
  }

  export class RenderTarget {
    constructor(...args: Array<unknown>);
    texture: unknown;
    setSize(width: number, height: number): void;
  }
}
