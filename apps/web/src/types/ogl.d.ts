declare module "ogl" {
  export class Color {
    constructor(...args: Array<any>);
    r: number;
    g: number;
    b: number;
  }

  export class Mesh {
    constructor(...args: Array<any>);
  }

  export class Program {
    constructor(...args: Array<any>);
    uniforms: Record<string, { value: unknown }>;
  }

  export class Renderer {
    constructor(...args: Array<any>);
    gl: WebGLRenderingContext & { canvas: HTMLCanvasElement };
    setSize(width: number, height: number): void;
    render(options: Record<string, unknown>): void;
  }

  export class Triangle {
    constructor(...args: Array<any>);
    attributes: Record<string, unknown>;
  }

  export class RenderTarget {
    constructor(...args: Array<any>);
    texture: unknown;
    setSize(width: number, height: number): void;
  }
}
