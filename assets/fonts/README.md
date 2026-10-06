# Fuentes

Instancias estáticas de **Bricolage Grotesque** (licencia SIL Open Font License, ver `OFL.txt`),
generadas desde la fuente variable de Google Fonts con fontTools. La web usa el eje de tamaño
óptico automático; React Native no puede moverlo, así que hay una versión fija por uso:

| Archivo | Peso | Tamaño óptico | Uso |
| --- | --- | --- | --- |
| Bricolage-SemiBold.ttf | 600 | 17 | títulos y montos de 15–21 pt |
| Bricolage-ExtraBold.ttf | 800 | 21 | la marca |
| Bricolage-ExtraBold-Display.ttf | 800 | 30 | total de la dona, apertura |
| Bricolage-ExtraBold-Large.ttf | 800 | 48 | monto del formulario |

Cada archivo tiene un nombre PostScript propio (`GastitoBricolage-…`) para que iOS no los confunda.

Para regenerarlas:

```bash
pip install fonttools
fonttools varLib.instancer "BricolageGrotesque[opsz,wdth,wght].ttf" wght=600 opsz=17 wdth=100 -o Bricolage-SemiBold.ttf
```

(y después renombrar las tablas `name` con un nombre único por archivo).
