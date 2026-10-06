import { nextAmountInput, parseWholeAmount, wholeAmountInput } from '../amountInput';
import { dayLabel, daysInMonth, monthAbbr, monthTitle, shiftMonth, shortDate } from '../dates';
import { amountToInput, money, moneyParts, parseAmount } from '../money';
import { cleanText, firstGrapheme, firstGraphemeManual } from '../text';

/** Simula tipear tecla por tecla al final del campo. */
const type = (keys: string) =>
  [...keys].reduce((prev, key) => {
    const edit = nextAmountInput(prev, prev + key);
    return edit.ok ? edit.value : prev;
  }, '');
const backspace = (prev: string) => {
  const edit = nextAmountInput(prev, prev.slice(0, -1));
  return edit.ok ? edit.value : prev;
};

describe('montos', () => {
  it('formatea como es-AR', () => {
    expect(money(18400)).toBe('$\u00a018.400');
    expect(money(1234567.6)).toBe('$\u00a01.234.568');
    expect(money(null)).toBe('$\u00a00');
    expect(moneyParts(150700)).toEqual({ main: '$\u00a0150.700', cents: '00' });
    expect(moneyParts(12.5)).toEqual({ main: '$\u00a012', cents: '50' });
  });

  it('interpreta lo escrito a mano', () => {
    expect(parseAmount('18.400')).toBe(18400);
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('$ 1.500,75')).toBe(1500.75);
    expect(parseAmount('')).toBeNaN();
    expect(amountToInput(18400)).toBe('18.400');
    expect(amountToInput(1234.5)).toBe('1.234,50');
  });
});

describe('campo de monto', () => {
  it('pone los puntos de miles mientras se tipea', () => {
    expect(type('12345')).toBe('12.345');
    expect(type('1000000')).toBe('1.000.000');
    expect(type('005')).toBe('5');
  });

  it('borrar no convierte los miles en decimales (bug de la web)', () => {
    expect(backspace('12.345')).toBe('1.234');
  });

  it('acepta coma o punto como separador decimal', () => {
    expect(type('12,5')).toBe('12,5');
    expect(type('12.5')).toBe('12,5');
    expect(type('12,999')).toBe('12.999');
  });

  it('limpia lo pegado y rechaza letras', () => {
    expect(nextAmountInput('', '$ 1.500,75')).toEqual({ ok: true, value: '1.500,75' });
    expect(nextAmountInput('12', '12a')).toEqual({ ok: false });
  });
});

describe('presupuesto', () => {
  it('pone los puntos de miles y descarta lo que no es número', () => {
    expect(wholeAmountInput('600000')).toBe('600.000');
    expect(wholeAmountInput('$ 1.250.000,50')).toBe('1.250.000');
    expect(wholeAmountInput('00')).toBe('');
    expect(parseWholeAmount('600.000')).toBe(600000);
    expect(parseWholeAmount('')).toBeNull();
    expect(parseWholeAmount('0')).toBeNull();
  });
});

describe('fechas', () => {
  const now = new Date(2026, 9, 5, 12); // lunes 5 de octubre de 2026

  it('nombra meses y días en español', () => {
    expect(monthTitle('2026-10')).toBe('Octubre de 2026');
    expect(monthAbbr('2026-09')).toBe('Sept');
    expect(shortDate('2026-10-05')).toBe('5 oct 2026');
    expect(dayLabel('2026-10-05', now)).toBe('Hoy');
    expect(dayLabel('2026-10-04', now)).toBe('Ayer');
    expect(dayLabel('2026-10-03', now)).toBe('Sábado, 3 de octubre');
  });

  it('hace cuentas de meses', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('texto', () => {
  it.each([
    ['con Intl.Segmenter', firstGrapheme],
    ['sin Intl.Segmenter (Hermes)', firstGraphemeManual],
  ])('toma el primer emoji completo %s', (_name, first) => {
    expect(first('🏷️ etiqueta')).toBe('🏷️');
    expect(first('👍🏽!')).toBe('👍🏽');
    expect(first('🇦🇷 Argentina')).toBe('🇦🇷');
    expect(first('👨‍👩‍👧 familia')).toBe('👨‍👩‍👧');
    expect(first('abc')).toBe('a');
  });

  it('limpia caracteres de control y recorta', () => {
    expect(cleanText('  hola\u0007 mundo  ', 60)).toBe('hola mundo');
    expect(cleanText('abcdef', 3)).toBe('abc');
    expect(cleanText(42, 10)).toBe('');
  });
});
