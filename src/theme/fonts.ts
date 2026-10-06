/**
 * Bricolage Grotesque tiene un eje de "tamaño óptico": la web lo ajusta solo según el tamaño de
 * cada texto. React Native no puede mover ese eje, así que assets/fonts trae versiones fijas
 * generadas desde la fuente variable para cada uso (ver assets/fonts/README.md).
 */
export const fonts = {
  /** 600, tamaño óptico 17: títulos y montos de 15 a 21 pt */
  display: 'Bricolage-SemiBold',
  /** 800, tamaño óptico 21: la marca */
  displayBold: 'Bricolage-ExtraBold',
  /** 800, tamaño óptico 30: el total de la dona y la apertura */
  displayHero: 'Bricolage-ExtraBold-Display',
  /** 800, tamaño óptico 48: el monto grande del formulario */
  displayHuge: 'Bricolage-ExtraBold-Large',
} as const;

export const fontAssets = {
  [fonts.display]: require('../../assets/fonts/Bricolage-SemiBold.ttf'),
  [fonts.displayBold]: require('../../assets/fonts/Bricolage-ExtraBold.ttf'),
  [fonts.displayHero]: require('../../assets/fonts/Bricolage-ExtraBold-Display.ttf'),
  [fonts.displayHuge]: require('../../assets/fonts/Bricolage-ExtraBold-Large.ttf'),
};
