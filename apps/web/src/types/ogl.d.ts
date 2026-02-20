declare module "ogl" {
  export class Vec2 {
    constructor(...args: Array<unknown>);
    x: number;
    y: number;
    set(x: number, y: number): void;
  }

  export class Vec3 {
    constructor(...args: Array<unknown>);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): void;
  }

  export class Color {
    constructor(...args: Array<unknown>);
    r: number;
    g: number;
    b: number;
  }

  export class Mesh {
    constructor(...args: Array<unknown>);
    // Minimal transform surface for components that animate meshes.
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  }

  export class Program {
    constructor(...args: Array<unknown>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniforms: Record<string, { value: any }>;
  }

  export class Renderer {
    constructor(...args: Array<unknown>);
    gl: WebGLRenderingContext & { canvas: HTMLCanvasElement };
    dpr: number;
    setSize(width: number, height: number): void;
    render(options: Record<string, unknown>): void;
  }

  export class Triangle {
    constructor(...args: Array<unknown>);
    attributes: Record<string, unknown>;
  }

  export class Texture {
    constructor(...args: Array<unknown>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    image: any;
    width: number;
    height: number;
    minFilter: number;
    magFilter: number;
    wrapS: number;
    wrapT: number;
    flipY: boolean;
    generateMipmaps: boolean;
    format: number;
    type: number;
    needsUpdate: boolean;
    texture?: WebGLTexture;
  }

  export class Camera {
    constructor(...args: Array<unknown>);
    position: Vec3;
    perspective(options: Record<string, unknown>): void;
  }

  export class Geometry {
    constructor(...args: Array<unknown>);
  }

  export class RenderTarget {
    constructor(...args: Array<unknown>);
    texture: unknown;
    setSize(width: number, height: number): void;
  }
}
