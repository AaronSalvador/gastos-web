import { AssistantContext } from './models';

/**
 * Asistente "básico": responde sin IA usando los datos que el usuario ya tiene en pantalla.
 * Se usa cuando el backend no tiene configurada la clave de IA (o no está disponible).
 */

const money = (n: number): string =>
  'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Minúsculas y sin tildes, para comparar sin importar cómo escriba el usuario. */
const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿?¡!.,;:]/g, ' ');

const TIPS: Record<string, string> = {
  comida: 'Planifica el menú de la semana, lleva almuerzo de casa 2 o 3 días y compara precios en el mercado.',
  transporte: 'Agrupa tus trayectos, prueba rutas o transporte compartido y evita taxis en hora punta.',
  educacion: 'Busca becas, materiales digitales o cursos gratuitos, y revisa si hay descuento por pago anual.',
  entretenimiento: 'Revisa suscripciones que ya no usas, comparte planes familiares y fija un tope mensual.',
  salud: 'Pregunta por genéricos, aprovecha campañas de prevención y revisa qué cubre tu seguro.',
  otros: 'Revisa el detalle de "Otros": si algo se repite, mejor ubícalo en una categoría propia para controlarlo.',
};

interface Row { label: string; amount: number; percent: number }

function rows(ctx: AssistantContext): Row[] {
  const entries = Object.entries(ctx.byCategory).filter(([, v]) => v > 0);
  const total = ctx.total > 0 ? ctx.total : entries.reduce((s, [, v]) => s + v, 0);
  return entries
    .map(([label, amount]) => ({ label, amount, percent: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

const NO_DATA =
  'Todavía no tienes gastos registrados. Agrega el primero desde el formulario "Nuevo gasto" y vuelvo a analizarlo contigo.';

const HELP =
  'Puedo ayudarte con esto:\n' +
  '• Ver cuánto has gastado y en qué categoría gastas más\n' +
  '• Darte consejos para ahorrar\n' +
  '• Explicarte cómo agregar, editar, eliminar o filtrar gastos\n' +
  '• Resumir tus últimos gastos\n\n' +
  'Prueba con: "¿En qué gasto más?" o "Dame un consejo para ahorrar".';

export function localReply(question: string, ctx: AssistantContext): string {
  const q = norm(question);
  const data = rows(ctx);
  const has = data.length > 0;
  const total = ctx.total > 0 ? ctx.total : data.reduce((s, r) => s + r.amount, 0);

  const is = (re: RegExp) => re.test(q);

  if (is(/\b(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)\b/)) {
    return '¡Hola! 👋 ¿En qué te ayudo con tus gastos?\n\n' + HELP;
  }

  if (is(/\b(gracias|genial|perfecto|excelente)\b/)) {
    return '¡Con gusto! Si necesitas algo más sobre tus gastos, aquí estoy.';
  }

  if (is(/\b(como|donde)\b.*(agreg|registr|anad|crear|ingres|cargar)|nuevo gasto/)) {
    return (
      'Para agregar un gasto:\n' +
      '1. Ve al cuadro "Nuevo gasto".\n' +
      '2. Escribe la descripción, el monto y elige la fecha y la categoría.\n' +
      '3. Pulsa "Agregar".\n\n' +
      'La fecha no puede ser futura y el monto debe ser mayor a cero.'
    );
  }

  if (is(/\b(como|donde)\b.*(edit|modific|cambi|correg|actualiz)/)) {
    return (
      'Para editar un gasto:\n' +
      '1. En "Mis gastos", pulsa "Editar" en la fila que quieras corregir.\n' +
      '2. Cambia los datos en el formulario de la izquierda.\n' +
      '3. Pulsa "Guardar cambios" (o "Cancelar" para salir sin cambiar nada).'
    );
  }

  if (is(/\b(como|donde)\b.*(elimin|borr|quit)/)) {
    return 'Para eliminar un gasto, pulsa "Eliminar" en su fila dentro de "Mis gastos". Te pedirá confirmar antes de borrarlo.';
  }

  if (is(/filtr|buscar por categoria|solo de una categoria/)) {
    return 'Usa el selector "Todas las categorías" que está arriba de la tabla de "Mis gastos": al elegir una categoría, la lista muestra solo esos gastos.';
  }

  if (is(/grafico|pastel|circular|\bdona\b|anillo/)) {
    return 'El gráfico de pastel muestra qué porcentaje de tu gasto total corresponde a cada categoría. Pasa el mouse sobre un segmento (o sobre la leyenda) para ver su monto y porcentaje.';
  }

  if (is(/ahorr|consejo|reducir|recort|gastar menos|mejorar|economizar/)) {
    if (!has) {
      return NO_DATA + '\n\nMientras tanto, una regla útil es la 50/30/20: 50% necesidades, 30% gustos y 20% ahorro.';
    }
    const top = data[0];
    const tip = TIPS[norm(top.label).trim()] ?? 'Revisa los gastos más grandes y pregúntate cuáles son realmente necesarios.';
    return (
      `Tu categoría más grande es ${top.label}: ${money(top.amount)} (${top.percent.toFixed(0)}% del total).\n\n` +
      `Consejo para ${top.label}: ${tip}\n\n` +
      'Y una regla general: destina 50% a necesidades, 30% a gustos y 20% a ahorro.'
    );
  }

  if (is(/presupuesto|50.?30.?20|regla/)) {
    return (
      'La regla 50/30/20 divide tus ingresos así:\n' +
      '• 50% necesidades (vivienda, comida, transporte)\n' +
      '• 30% gustos y ocio\n' +
      '• 20% ahorro o pago de deudas\n\n' +
      'Es una guía, no una obligación: ajústala a tu situación.'
    );
  }

  if (is(/\b(en que|donde)\b.*gast|\bmas\b.*gast|gast\w*\b.*\bmas\b|mayor|principal/)) {
    if (!has) return NO_DATA;
    const top = data[0];
    const second = data[1];
    return (
      `Gastas más en ${top.label}: ${money(top.amount)}, que es el ${top.percent.toFixed(0)}% de tu total.` +
      (second ? `\nLe sigue ${second.label} con ${money(second.amount)} (${second.percent.toFixed(0)}%).` : '')
    );
  }

  if (is(/categoria|distribucion|desglose|porcentaje|resum/)) {
    if (!has) return NO_DATA;
    const lines = data.map(r => `• ${r.label}: ${money(r.amount)} (${r.percent.toFixed(0)}%)`).join('\n');
    return `Este es el resumen de tus gastos (total ${money(total)}):\n${lines}`;
  }

  if (is(/total|cuanto.*(gast|llevo)|he gastado|gastado|cuanto/)) {
    if (!has) return NO_DATA;
    return `Hasta ahora has gastado ${money(total)} en total, repartidos en ${data.length} ${data.length === 1 ? 'categoría' : 'categorías'}.`;
  }

  if (is(/ultim|reciente/)) {
    if (ctx.recent.length === 0) return NO_DATA;
    const lines = ctx.recent
      .slice(0, 5)
      .map(e => `• ${e.date} · ${e.description} · ${money(e.amount)} (${e.category})`)
      .join('\n');
    return `Tus gastos más recientes a la vista:\n${lines}`;
  }

  if (is(/ayuda|ayudame|que puedes|que haces|opciones|que sabes/)) {
    return HELP;
  }

  return 'No estoy seguro de haber entendido 🤔.\n\n' + HELP;
}
