# ADR 0001: mundo 3D com texturas pixel art e monstros em sprites 2.5D

**Status:** aceito (sprint 1). Substitui a versão 2D ortográfica que existiu antes desta decisão.
**Data:** 14/11/2026

## Contexto

O projeto é 2.5D: o mundo é 3D, com texturas pixel art, e os monstros são sprites 2.5D.
Os assets recebidos são PNGs pixel art: tiles 32x32 de solo, paredões, marcos 64x64,
e folhas 128x32 com quatro direções por monstro (sem animação de clips).

## Decisão

- **Mundo 3D.** Câmera em perspectiva inclinada (~38°, com órbita limitada). O solo são planos
  texturizados, e os desníveis são paredões verticais com a textura de paredão.
- **Texturas pixel art.** `NearestFilter` nas duas direções, sem mipmaps, espaço sRGB, para manter os pixels nítidos.
  Iluminação com `MeshLambertMaterial` no mundo, para o sombreamento dos paredões.
- **Monstros e props em sprites 2.5D (billboards).** Cada um é um quad com a base no chão, que gira só no eixo Y
  para olhar para a câmera. Usam `MeshBasicMaterial` com `alphaTest`, sem sombreamento.
- **Direção do sprite.** A direção do monstro no mundo é comparada com a direção até a câmera e com a direção
  horizontal da tela. Assim o quadro `down` aparece quando ele anda em direção ao observador, `up` quando se afasta,
  e `left`/`right` quando anda de lado na tela.
- **Uma textura clonada por criatura**, com `repeat` e `offset`, para que cada uma escolha seu próprio quadro.
- A lógica de simulação continua separada do Three.js, como exige a arquitetura de referência.

## Alternativas descartadas

- **Câmera ortográfica 2D.** Foi a primeira versão. Não atende ao projeto, que é 3D com sprites 2.5D.
- **Modelos 3D gerados a partir dos sprites.** Viola o princípio 7 do MD e cria arte substituta sem auditoria.
- **Sprites com câmera de frente fixa, sem billboard.** Os monstros ficariam de lado para a câmera em qualquer órbita.

## Consequências

- O mundo usa uma `Mesh` por tile nesta sprint. Para escala (MT-033 e mais), a troca por `InstancedMesh` por textura fica isolada em `src/rendering/`.
- A escolha de quadro depende da câmera. Por isso `view.update(camera)` roda a cada frame.
- O pacote tem pouca diferença entre `up` e `down` em muitos monstros (ver `docs/ASSET_PIPELINE.md`). A leitura de "de costas" será fraca até haver arte nova.
