# Mythos Terrarium

Simulador de ecossistema mitológico: mundo 3D com texturas pixel art e monstros em sprites 2.5D. Criaturas vivem de forma autônoma em habitats conectados.
Especificação: `docs/reference/Mythos_Terrarium_Arquitetura_Tecnica_1.0.md`.

## Status

Sprint 1 (MT-001 a MT-006), em andamento:

- [x] Projeto Vite + TypeScript + Three.js
- [x] Asset Inspector e manifesto (60 monstros, 10 biomas)
- [x] Relatório de compatibilidade (`docs/ASSET_PIPELINE.md`)
- [x] Cena 2.5D com um bioma real e um monstro real, direções pelas setas
- [ ] Simulação lógica (ainda não existe)

## Como rodar

```bash
npm install
npm run assets:inspect -- <pasta_monstros> <pasta_biomas>   # só se os assets mudarem
npm run dev                                                 # http://127.0.0.1:5173
```

Os zips originais não ficam no repositório. `assets:inspect` recebe as pastas já extraídas
e copia para `public/assets/` só os arquivos de runtime.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck e build de produção |
| `npm run typecheck` | Só o TypeScript |
| `npm test` | Testes unitários (manifesto de assets) |
| `npm run assets:inspect` | Audita os pacotes e gera manifesto e inventário |

## Estrutura

```
scripts/asset-inspector/   auditoria dos pacotes, leitura de PNG sem dependências
public/assets/             arquivos de runtime e manifest.json (gerado)
src/assets/                carregamento e validação do manifesto
src/rendering/             Three.js: texturas, terreno 3D, billboards
src/shared/types/          contratos (manifesto)
tests/unit/                testes de manifesto
docs/                      relatórios, ADRs, inventário e referência
```

## Decisões

- [ADR 0001: mundo 3D com texturas pixel art e sprites 2.5D](docs/adr/0001-mundo-3d-com-sprites-2-5d.md)
- Assets são pixel art sem animação: ver [relatório de compatibilidade](docs/ASSET_PIPELINE.md).
