import { createCategoryLookup } from '../catalog';
import { parseAppLink, splitUrl } from '../links';

const NOW = new Date(2026, 9, 5, 12);
const categories = createCategoryLookup([
  { id: 'mia_1', name: 'Mascotas', color: '#E0452F', emoji: '🐶', custom: true },
]);
const parse = (url: string) => parseAppLink(url, categories, NOW);

describe('links profundos', () => {
  it('abre secciones, con o sin mes', () => {
    expect(parse('gastito://resumen')).toEqual({ kind: 'view', view: 'resumen' });
    expect(parse('gastito://fijos?mes=2026-09')).toEqual({ kind: 'view', view: 'fijos', month: '2026-09' });
    expect(parse('gastito://movimientos/')).toEqual({ kind: 'view', view: 'movimientos' });
    expect(parse('gastito://ajustes')).toEqual({ kind: 'settings' });
  });

  it('ignora meses inválidos o futuros', () => {
    expect(parse('gastito://resumen?mes=2026-13')).toEqual({ kind: 'view', view: 'resumen' });
    expect(parse('gastito://resumen?mes=2027-01')).toEqual({ kind: 'view', view: 'resumen' });
    expect(parse('gastito://resumen?mes=1999-12')).toEqual({ kind: 'view', view: 'resumen' });
  });

  it('abre el formulario con lo que traiga, validado', () => {
    expect(parse('gastito://anotar?monto=1.500&categoria=super&nota=Verdulería%20del%20barrio')).toEqual({
      kind: 'new-expense',
      prefill: { amount: 1500, categoryId: 'super', note: 'Verdulería del barrio' },
    });
    expect(parse('gastito://anotar?categoria=MASCOTAS')).toEqual({
      kind: 'new-expense',
      prefill: { categoryId: 'mia_1' },
    });
    expect(parse('gastito://anotar?monto=12,50')).toEqual({ kind: 'new-expense', prefill: { amount: 12.5 } });
  });

  it('descarta lo que no sirve sin romper nada', () => {
    expect(parse('gastito://anotar?monto=-5&categoria=inventada&nota=%00%01')).toEqual({
      kind: 'new-expense',
      prefill: {},
    });
    expect(parse('gastito://anotar?monto=abc&nota=%E0%A4%A')).toEqual({ kind: 'new-expense', prefill: {} });
    const long = parse(`gastito://anotar?nota=${'a'.repeat(200)}`);
    expect(long?.kind === 'new-expense' && long.prefill.note?.length).toBe(60);
  });

  it('no reconoce otras rutas ni cosas que no son links', () => {
    expect(parse('gastito://borrar-todo')).toBeNull();
    expect(parse('javascript:alert(1)')).toBeNull();
    expect(parse('')).toBeNull();
    expect(parse(`gastito://anotar?nota=${'x'.repeat(5000)}`)).toBeNull();
  });

  it('entiende los links de desarrollo de Expo Go', () => {
    expect(splitUrl('exp://192.168.0.10:8081/--/anotar?monto=10')).toEqual({
      route: 'anotar',
      params: { monto: '10' },
    });
    expect(parse('exp://127.0.0.1:8081/--/fijos')).toEqual({ kind: 'view', view: 'fijos' });
  });
});
