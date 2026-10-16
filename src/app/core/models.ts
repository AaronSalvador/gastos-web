export type Category =
  | 'COMIDA' | 'TRANSPORTE' | 'EDUCACION' | 'ENTRETENIMIENTO' | 'SALUD' | 'OTROS';

export const CATEGORIES: Category[] =
  ['COMIDA', 'TRANSPORTE', 'EDUCACION', 'ENTRETENIMIENTO', 'SALUD', 'OTROS'];

export const CATEGORY_LABELS: Record<Category, string> = {
  COMIDA: 'Comida',
  TRANSPORTE: 'Transporte',
  EDUCACION: 'Educación',
  ENTRETENIMIENTO: 'Entretenimiento',
  SALUD: 'Salud',
  OTROS: 'Otros',
};

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: Category;
  date: string;
}

export interface ExpenseRequest {
  description: string;
  amount: number;
  category: Category;
  date: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Summary {
  total: number;
  byCategory: Partial<Record<Category, number>>;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
}

/* ---------- Asistente de IA ---------- */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantContext {
  total: number;
  /** Total por categoría con nombre legible (ej. "Comida": 25). */
  byCategory: Record<string, number>;
  /** Gastos que el usuario tiene a la vista (máx. 10). */
  recent: { date: string; description: string; amount: number; category: string }[];
}

export interface AssistantRequest {
  message: string;
  history: ChatTurn[];
  context: AssistantContext;
}

export interface AssistantResponse {
  reply: string;
}
