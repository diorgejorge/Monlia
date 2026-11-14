import * as THREE from 'three';
import { assetUrl } from '../assets/manifest';

// Cache de texturas por caminho. Pixel art precisa de filtro Nearest e sem mipmaps.
const cache = new Map<string, Promise<THREE.Texture>>();

export function loadPixelTexture(relativePath: string): Promise<THREE.Texture> {
  let pending = cache.get(relativePath);
  if (!pending) {
    pending = new THREE.TextureLoader().loadAsync(assetUrl(relativePath)).then((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.generateMipmaps = false;
      return texture;
    });
    cache.set(relativePath, pending);
  }
  return pending;
}

// Uma folha 128x32 tem quatro quadros 32x32 lado a lado (um por direção).
// Cada criatura recebe seu próprio clone da textura, porque o offset de UV fica na textura.
export function frameTexture(base: THREE.Texture, frameIndex: number, frameCount: number): THREE.Texture {
  const tex = base.clone();
  tex.repeat.set(1 / frameCount, 1);
  tex.offset.set(frameIndex / frameCount, 0);
  tex.needsUpdate = true;
  return tex;
}
