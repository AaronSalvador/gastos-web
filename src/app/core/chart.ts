import { Category } from './models';

/** Color de cada categoría (variables CSS definidas en styles.css, cambian con el tema). */
export const CATEGORY_COLORS: Record<Category, string> = {
  COMIDA: 'var(--chart-1)',
  TRANSPORTE: 'var(--chart-3)',
  EDUCACION: 'var(--chart-6)',
  ENTRETENIMIENTO: 'var(--chart-4)',
  SALUD: 'var(--chart-5)',
  OTROS: 'var(--chart-2)',
};

export interface PieSlice {
  category: Category;
  amount: number;
  percent: number;      // 0-100
  color: string;
  dash: string;         // stroke-dasharray del segmento (circunferencia = 100)
  offset: number;       // stroke-dashoffset del segmento
}

/**
 * Convierte los totales por categoría en segmentos de un gráfico de anillo.
 * El círculo usa radio 15.9155, así la circunferencia mide exactamente 100
 * y cada porcentaje se puede usar directo como longitud del trazo.
 */
export function buildPie(byCategory: Partial<Record<Category, number>>): PieSlice[] {
  const rows = (Object.entries(byCategory) as [Category, number][])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
  if (total <= 0) return [];

  const gap = rows.length > 1 ? 0.8 : 0;   // pequeña separación entre segmentos
  let cumulative = 0;

  return rows.map(([category, amount]) => {
    const percent = (amount / total) * 100;
    const visible = Math.max(percent - gap, 0.01);
    const slice: PieSlice = {
      category,
      amount,
      percent,
      color: CATEGORY_COLORS[category],
      dash: `${visible} ${100 - visible}`,
      offset: -(cumulative + gap / 2) || 0,
    };
    cumulative += percent;
    return slice;
  });
}
