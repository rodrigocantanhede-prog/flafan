# Uso (manutenção): python3 -I scripts/tirar-fundo-branco.py escudos/arquivo.webp ...  (regrava o arquivo com o fundo transparente)
# tira o fundo branco que encosta na borda (flood fill), mantendo o branco de dentro do escudo
import sys
from PIL import Image
from collections import deque
def claro(p, lim): return p[3] > 200 and min(p[:3]) >= lim
def processar(f, saida, lim=215):
    im = Image.open(f).convert('RGBA'); w, h = im.size; px = im.load()
    borda = [(x, 0) for x in range(w)] + [(x, h-1) for x in range(w)] + [(0, y) for y in range(h)] + [(w-1, y) for y in range(h)]
    vis = set(); fila = deque(p for p in borda if claro(px[p], lim))
    vis.update(fila)
    while fila:
        x, y = fila.popleft()
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in vis and claro(px[nx, ny], lim):
                vis.add((nx, ny)); fila.append((nx, ny))
    total = len(vis)
    for (x, y) in vis: px[x, y] = (255, 255, 255, 0)
    # borda suave: pixels claros vizinhos do fundo removido ficam meio transparentes
    for (x, y) in list(vis):
        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in vis:
                r, g, b, a = px[nx, ny]; m = min(r, g, b)
                if m > 170: px[nx, ny] = (r, g, b, int(a * (255 - m) / 85))
    im.save(saida)
    return total / (w * h)
for f in sys.argv[1:]:
    print(f, round(processar(f, f), 2))
