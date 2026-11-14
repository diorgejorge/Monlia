import type { Manifest } from '../shared/types/manifest';

// Caminho base dos assets, respeitando o base do Vite (dev e build).
export function assetUrl(relativePath: string): string {
  return `${import.meta.env.BASE_URL}assets/${relativePath}`;
}

export async function loadManifest(): Promise<Manifest> {
  const response = await fetch(assetUrl('manifest.json'));
  if (!response.ok) {
    throw new Error(`Manifesto não encontrado (${response.status}). Rode "npm run assets:inspect".`);
  }
  const manifest = (await response.json()) as Manifest;
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Versão de manifesto não suportada: ${manifest.schemaVersion}`);
  }
  const errors = manifest.issues.filter((i) => i.level === 'error');
  if (errors.length > 0) {
    throw new Error(`Manifesto com ${errors.length} erro(s). Veja docs/ASSET_INVENTORY.md.`);
  }
  return manifest;
}
