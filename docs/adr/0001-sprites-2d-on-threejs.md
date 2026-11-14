# ADR 0001: sprites 2D pixel art sobre Three.js

**Status:** aceito (sprint 1)
**Data:** 14/11/2026

## Contexto

A arquitetura de referência (`docs/reference/…1.0.md`) foi escrita para modelos 3D (GLB, rigs, clips de animação).
Os assets recebidos são PNGs pixel art 2D: tiles 32x32, folhas 128x32 com quatro direções e nenhuma animação.
O princípio 7 pede para aproveitar os assets existentes e não criar modelos substitutos antes da auditoria.

## Decisão

- Renderizar com Three.js usando **câmera ortográfica top-down**.
- Representar cada tile, prop e criatura como um **quad texturizado** (`PlaneGeometry` com `MeshBasicMaterial`).
- Filtro `NearestFilter`, sem mipmaps, `SRGBColorSpace`, `alphaTest` 0.5 para bordas nítidas.
- Uma textura clonada por criatura, com `repeat` e `offset` para escolher o quadro da direção.
- A simulação continua independente do Three.js, como exige a arquitetura. A cena só lê o estado.

## Alternativas consideradas

- **Billboards 3D em cena com perspectiva.** Mais complexo, sem ganho visual para pixel art top-down.
- **Canvas 2D puro.** Simples, mas a arquitetura pede Three.js como núcleo visual, e o caminho para 3D ficaria fechado.
- **Gerar modelos 3D a partir dos sprites.** Viola o princípio 7 e cria arte substituta sem auditoria.

## Consequências

- A cena não precisa de AnimationMixer nesta fase; animação será feita por troca de quadros e oscilação.
- Se um dia houver modelos 3D, a troca de `PlaneGeometry` por `GLTFLoader` fica isolada no módulo de renderização.
- Escala e câmera ficam em constantes em `src/rendering/`, fáceis de ajustar.
