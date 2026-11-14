# Relatório de compatibilidade dos assets

Sprint 1 (MT-001 a MT-006). Confronta o que a arquitetura assume
(`docs/reference/Mythos_Terrarium_Arquitetura_Tecnica_1.0.md`) com o que os pacotes realmente contêm.
Inventário completo: `docs/ASSET_INVENTORY.md` (gerado pelo `npm run assets:inspect`).

## Resumo

| Item | A arquitetura assume | O pacote tem |
|---|---|---|
| Formato | GLB/GLTF/FBX, modelos 3D | PNG pixel art 2D |
| Monstros | Modelo + rig + clips | Folha 128x32 por monstro, 4 direções fixas |
| Animações | Clips por ação (idle, walk, fly, attack) | Nenhuma. 1 quadro estático por direção |
| Locomoção | Terrestre, voo, natação, escalada | Não verificável. Nenhum clip por tipo |
| Terreno | Terreno 3D real | Tiles 32x32 seamless por bioma |
| Mundo | Setores ilustrativos | 10 biomas com mapeamento oficial de criaturas |
| Licença | Não citada | Não citada no pacote |

## Monstros

- 60 monstros, todos cobertos por exatamente um bioma.
- Cada folha tem 128x32: quatro quadros 32x32 na ordem `down, up, left, right`.
- Os quadros `down` e `up` são diferentes, mas quase iguais para a maioria dos monstros:
  - Em 50 de 60 folhas, `up` muda menos de 5% dos pixels de sprite em relação a `down`.
  - Mediana: 2,2% dos pixels de sprite mudam.
  - Consequência: a leitura de "de costas" é fraca. A orientação visual depende de poucos detalhes (cabelo, pontas).
  - Os lados `left` e `right` são espelhos só em 4 de 60, porque as criaturas têm acessórios assimétricos. Isso é esperado.
- Não há clips de animação. O movimento precisará ser feito por código (bobbing, troca de quadro, oscilação de pernas), ou por novos quadros que o pacote não tem.

## Biomas

- 10 biomas, cada um com: 4 solos seamless, 1 caminho, 1 paredão, 8 transições de borda, 4 props (2 marcos 64x64 e 2 props 32x32) e 2 sheets animados 96x32 (água e braseiro/cristais).
- Os quadros soltos `liquid_frame_0N.png` não são usados: a sheet `*_3frames_96x32.png` já tem os três quadros.
- Os atlas `*_tileset_atlas.png` (256x192 e 768x576) e as prévias 480x480 e 4x não entram em `public/assets`. São para referência.

## Decisões tomadas nesta sprint

1. **Sprites 2D sobre Three.js.** Os assets são 2D, então a cena usa câmera ortográfica top-down e quads texturizados. Não criamos modelos 3D substitutos (princípio 7). Registrado em `docs/adr/0001-sprites-2d-on-threejs.md`.
2. **Filtro Nearest, sem mipmaps, espaço sRGB** para manter a pixel art nítida.
3. **Um clone de textura por criatura**, porque o offset do quadro fica na textura e um compartilhado mostraria a mesma direção em todas.
4. **`locomotion: "unverified"`** em todos os monstros. O pacote não informa quais podem voar ou nadar, então nenhuma capacidade é inventada.
5. **`animations: {}`** em todos os monstros, pelo mesmo motivo.
6. **Escala 1.0** (1 tile = 32 px), sem ajuste por espécie. A diferença de tamanho real entre monstros ainda não foi verificada.

## Verificação

- `npm run assets:inspect`: 0 erros, 0 avisos. Todos os caminhos existem, folhas 128x32, tiles 32x32, marcos 64x64, sheets animados 96x32, 60 monstros cobertos.
- `npm test`: testes de manifesto (existência e dimensões) passam.
- Render no Chromium headless com `npm run dev`: solo, caminho, paredão, marco, relíquia e o sátiro aparecem com pixels nítidos. As setas trocam a direção. Ver `docs/screenshots/`.
- Comparação com a prévia oficial do bioma 1 (`diorama_previews_3x`): a paleta e o estilo batem.

## Lacunas e pendências

- **Transições de borda** (8 por bioma) estão no manifesto mas não são renderizadas na sprint 1. Precisam de regra de auto-tiling.
- **Sheets animados** (água, braseiro) também não entram na cena. Falta um animador por quadros.
- **Licença do pacote** não está declarada. Confirmar antes de publicar o projeto.
- **Direção "up" fraca** nos monstros (ver acima). Decidir se a IA usa só três direções visuais, ou se precisamos de arte nova para costas.
- **Altura relativa entre espécies** não verificada. Um Kraken e um Sátiro podem precisar de escala diferente.
- **Locomoção por tipo** (voo, natação, escalada): sem informação no pacote. Decidir se usamos o `archetype` como dica ou se marcamos manualmente.
- **Bioma 1 apenas** é usado pela demo. Os outros 9 estão no manifesto para as próximas sprints.
