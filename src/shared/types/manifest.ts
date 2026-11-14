// Contrato do manifesto gerado por scripts/asset-inspector.
// Caminhos são relativos a public/assets/.

export type Direction = 'down' | 'up' | 'left' | 'right';

export interface CreatureAsset {
  id: number;
  slug: string;
  name: string;
  mythology: string;
  archetype: string;
  sheet: string;
  frameSize: [number, number];
  scale: number;
  animations: Record<string, string>;
  locomotion: 'unverified' | 'walk' | 'fly' | 'swim' | 'climb';
}

export interface BiomeAsset {
  id: number;
  slug: string;
  name: string;
  folder: string;
  palette: Record<string, string>;
  creatureIds: number[];
  tileSize: number;
  landmarkSize: number;
  tiles: { ground: string[]; path: string[]; cliff: string[] };
  transitions: string[];
  props: string[];
  animated: string[];
}

export interface AssetIssue {
  level: 'error' | 'warn';
  code: string;
  message: string;
}

export interface Manifest {
  schemaVersion: 1;
  frameDirections: Direction[];
  creatures: CreatureAsset[];
  biomes: BiomeAsset[];
  coverage: {
    creatureCount: number;
    biomeCount: number;
    uncovered: number[];
    inMultipleBiomes: number[];
  };
  issues: AssetIssue[];
}
