import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { AssistantService } from '../../core/assistant.service';
import { errorMessage } from '../../core/errors';
import { localReply } from '../../core/local-assistant';
import {
  AssistantContext,
  CATEGORY_LABELS,
  ChatTurn,
  Expense,
  Summary,
} from '../../core/models';

interface Msg {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

const WELCOME =
  '¡Hola! 👋 Soy tu asistente de gastos. Puedo analizar en qué gastas, darte consejos para ahorrar y explicarte cómo usar la página.';

@Component({
  selector: 'app-assistant',
  styleUrl: './assistant.component.css',
  template: `
    <button
      class="fab"
      type="button"
      (click)="toggle()"
      aria-controls="assistant-panel"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="open() ? 'Cerrar asistente' : 'Abrir asistente de ayuda'"
    >
      @if (open()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      } @else {
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5zM18.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4zM6 15.5l.7 1.8 1.8.7-1.8.7L6 20.5l-.7-1.8-1.8-.7 1.8-.7.7-1.8z"/></svg>
      }
    </button>

    @if (open()) {
      <section
        id="assistant-panel"
        class="panel"
        role="dialog"
        aria-label="Asistente de gastos"
        (keydown.escape)="open.set(false)"
      >
        <header class="head">
          <span class="avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.1 5.1 1.9-5.1 1.9L12 16.5l-1.9-5.1L5 9.5l5.1-1.9L12 2.5zM18.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/></svg>
          </span>
          <div class="titles">
            <strong>Asistente Expense</strong>
            <small>{{ mode() === 'ai' ? 'Te ayudo con tus gastos' : 'Modo básico · sin IA' }}</small>
          </div>
          <button class="icon-btn" type="button" (click)="open.set(false)" aria-label="Cerrar asistente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </header>

        <div class="messages" #list aria-live="polite">
          @for (m of messages(); track m.id) {
            <div class="msg" [class.user]="m.role === 'user'">
              <p>{{ m.text }}</p>
            </div>
          }

          @if (sending()) {
            <div class="msg typing" aria-label="El asistente está escribiendo">
              <span></span><span></span><span></span>
            </div>
          }
        </div>

        @if (messages().length <= 1) {
          <div class="chips">
            @for (s of suggestions; track s) {
              <button type="button" (click)="send(s)">{{ s }}</button>
            }
          </div>
        }

        <div class="composer">
          <textarea
            #box
            rows="1"
            maxlength="500"
            placeholder="Escribe tu pregunta…"
            aria-label="Escribe tu pregunta"
            [value]="draft()"
            (input)="draft.set($any($event.target).value)"
            (keydown.enter)="onEnter($event)"
          ></textarea>

          <button
            class="send"
            type="button"
            (click)="send()"
            [disabled]="sending() || !draft().trim()"
            aria-label="Enviar mensaje"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </section>
    }
  `,
})
export class AssistantComponent {
  /** Resumen y gastos a la vista: se envían como contexto para que el asistente conozca tus datos. */
  summary = input<Summary | null>(null);
  recent = input<Expense[]>([]);

  private api = inject(AssistantService);

  open = signal(false);
  sending = signal(false);
  draft = signal('');
  /** 'basic' = respuestas locales (el backend no tiene IA disponible). */
  mode = signal<'ai' | 'basic'>('ai');

  messages = signal<Msg[]>([{ id: 0, role: 'bot', text: WELCOME }]);

  suggestions = [
    '¿En qué gasto más?',
    'Dame un consejo para ahorrar',
    '¿Cómo agrego un gasto?',
    'Resume mis gastos',
  ];

  private nextId = 1;
  private list = viewChild<ElementRef<HTMLElement>>('list');
  private box = viewChild<ElementRef<HTMLTextAreaElement>>('box');

  /** Datos del usuario en el formato que entiende el asistente (categorías con nombre legible). */
  private context = computed<AssistantContext>(() => {
    const s = this.summary();
    const byCategory: Record<string, number> = {};
    for (const [key, value] of Object.entries(s?.byCategory ?? {})) {
      byCategory[CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] ?? key] = Number(value);
    }
    return {
      total: Number(s?.total ?? 0),
      byCategory,
      recent: this.recent()
        .slice(0, 10)
        .map(e => ({
          date: e.date,
          description: e.description,
          amount: Number(e.amount),
          category: CATEGORY_LABELS[e.category] ?? e.category,
        })),
    };
  });

  constructor() {
    // Baja al último mensaje cada vez que cambia la conversación.
    effect(() => {
      this.messages();
      this.sending();
      const el = this.list()?.nativeElement;
      if (el) setTimeout(() => (el.scrollTop = el.scrollHeight));
    });
  }

  toggle(): void {
    this.open.update(v => !v);
    if (this.open()) {
      setTimeout(() => this.box()?.nativeElement.focus(), 60);
    }
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey) return;          // Shift + Enter = salto de línea
    e.preventDefault();
    this.send();
  }

  send(preset?: string): void {
    const text = (preset ?? this.draft()).trim();
    if (!text || this.sending()) return;

    const history = this.history();   // antes de agregar el mensaje nuevo
    this.draft.set('');
    this.push('user', text);
    this.sending.set(true);

    if (this.mode() === 'basic') {
      this.answerLocally(text);
      return;
    }

    this.api.chat({ message: text, history, context: this.context() }).subscribe({
      next: res => {
        this.push('bot', res.reply);
        this.sending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 400 || err.status === 429) {
          // Error del usuario (mensaje inválido) o límite de uso: se avisa y se puede reintentar.
          this.push('bot', errorMessage(err));
          this.sending.set(false);
          return;
        }
        // IA no configurada o no disponible: se sigue con el asistente básico.
        this.mode.set('basic');
        this.answerLocally(text);
      },
    });
  }

  private answerLocally(text: string): void {
    const reply = localReply(text, this.context());
    setTimeout(() => {
      this.push('bot', reply);
      this.sending.set(false);
    }, 450);
  }

  /** Últimos turnos de la conversación (sin el saludo inicial) para dar contexto a la IA. */
  private history(): ChatTurn[] {
    return this.messages()
      .filter(m => m.id !== 0)
      .slice(-10)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
  }

  private push(role: Msg['role'], text: string): void {
    this.messages.update(list => [...list, { id: this.nextId++, role, text }]);
  }
}
