# Monlia · globo voxel

Protótipo de um globo feito de voxels, com um personagem andando pela superfície.
Sem build: three.js 0.160.0 carregado via jsDelivr e módulos ES nativos.

## Como rodar

Módulos ES não funcionam abrindo o arquivo direto (`file://`). Sirva a pasta:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Controles

- Arraste para girar, roda do mouse para aproximar.
- **Novo mundo**: gera outro terreno (seed diferente).
- **Seguir personagem**: a câmera acompanha o personagem por cima.

## Estrutura

- `index.html`: página, estilos e importmap do three.js.
- `main.js`: terreno (ruído determinístico), globo como `InstancedMesh`, personagem e loop.

## Estado atual (ponto de partida)

Conceito e identidade visual ainda em definição. Valores provisórios:

- Paleta: água `#2f6f9f`, areia `#e3cb86`, grama `#6aa84f`, rocha `#8a7f72`, neve `#f2f5f8`.
- Personagem: blocos simples (camisa laranja, calça azul-marinho), anda pela superfície e evita água e paredões.
