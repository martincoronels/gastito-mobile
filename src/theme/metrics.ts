/** Margen lateral de la pantalla (--pad en la web). */
export const PAD = 20;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

/** Lo que mide el encabezado sin contar la zona del notch/isla. */
export const HEADER_CONTENT_HEIGHT = 58;

/** Ocupa todo el contenedor (en CSS: position: absolute; inset: 0). */
export const FILL = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

/** La barra de pestañas flotante (estilo iOS 26) y el botón + que va a su lado. */
export const TAB_BAR = { height: 62, fab: 62, gap: 12 } as const;
