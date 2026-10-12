declare module "istextorbinary" {
  export function getEncoding(buffer: Buffer, opts?: { chunkLength?: number; chunkBegin?: number }): "utf8" | "binary";
  export function isText(filename: string | undefined, buffer?: Buffer): boolean;
  export function isBinary(filename: string | undefined, buffer?: Buffer): boolean;
}
