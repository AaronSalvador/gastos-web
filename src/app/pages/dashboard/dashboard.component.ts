
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { ExpenseService } from '../../core/expense.service';
import { errorMessage } from '../../core/errors';
import { buildPie } from '../../core/chart';
import { AssistantComponent } from '../../shared/assistant/assistant.component';

import {
  CATEGORIES,
  CATEGORY_LABELS,
  Category,
  Expense,
  ExpenseRequest,
  Summary,
} from '../../core/models';

/* ---------- Fecha local ---------- */

const today = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/* ---------- Validación de fecha ---------- */

const notFutureDate = (control: AbstractControl) => {
  const value = control.value;

  if (!value) {
    return null;
  }

  return value <= today() ? null : { futureDate: true };
};

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe, DecimalPipe, AssistantComponent],
  styleUrl: './dashboard.component.css',

  template: `
    <header class="topbar">
      <div class="wrap bar">
        <img class="brand" src="assets/logo.svg" alt="Expense" />

        <div class="bar-right">
          <span class="muted user">{{ auth.email() }}</span>

          <button
            class="btn ghost"
            type="button"
            (click)="auth.logout()"
          >
            Salir
          </button>
        </div>
      </div>
    </header>

    <main class="wrap">

      <!-- Resumen -->

      <section class="summary">

        <div class="card total">
          <span class="muted card-title">Total gastado</span>

          <strong>
            {{ (summary()?.total ?? 0) | currency:'PEN':'S/ ' }}
          </strong>
        </div>

        <div class="card bars">
          <span class="muted card-title">Por categoría</span>

          @for (bar of bars(); track bar.category) {
            <div class="bar-row">
              <span>{{ labels[bar.category] }}</span>

              <div class="track">
                <div
                  class="fill"
                  [style.width.%]="bar.percent"
                ></div>
              </div>

              <span class="amount">
                {{ bar.amount | currency:'PEN':'S/ ' }}
              </span>
            </div>
          } @empty {
            <p class="muted small">
              Aún no hay gastos para resumir.
            </p>
          }
        </div>

        <div class="card chart">
          <span class="muted card-title">Distribución del gasto</span>

          @if (slices().length > 0) {
            <div class="chart-body">
              <div
                class="donut"
                role="img"
                [attr.aria-label]="'Gráfico de pastel con ' + slices().length + ' categorías'"
              >
                <svg class="donut-svg" viewBox="0 0 42 42">
                  <circle class="ring" cx="21" cy="21" r="15.9155"></circle>

                  @for (s of slices(); track s.category) {
                    <circle
                      class="seg"
                      cx="21"
                      cy="21"
                      r="15.9155"
                      [style.stroke]="s.color"
                      [attr.stroke-dasharray]="s.dash"
                      [attr.stroke-dashoffset]="s.offset"
                      [class.dim]="hovered() !== null && hovered() !== s.category"
                      (mouseenter)="hovered.set(s.category)"
                      (mouseleave)="hovered.set(null)"
                    ></circle>
                  }
                </svg>

                <div class="donut-center">
                  @if (activeSlice(); as a) {
                    <small class="muted">{{ labels[a.category] }}</small>
                    <strong>{{ a.amount | currency:'PEN':'S/ ' }}</strong>
                    <small class="muted">{{ a.percent | number:'1.0-0' }}%</small>
                  } @else {
                    <small class="muted">Total</small>
                    <strong>{{ (summary()?.total ?? 0) | currency:'PEN':'S/ ' }}</strong>
                  }
                </div>
              </div>

              <ul class="legend">
                @for (s of slices(); track s.category) {
                  <li
                    tabindex="0"
                    [class.active]="hovered() === s.category"
                    (mouseenter)="hovered.set(s.category)"
                    (mouseleave)="hovered.set(null)"
                    (focus)="hovered.set(s.category)"
                    (blur)="hovered.set(null)"
                  >
                    <span class="dot" [style.background]="s.color"></span>
                    <span class="lname">{{ labels[s.category] }}</span>
                    <span class="lpct">{{ s.percent | number:'1.0-0' }}%</span>
                  </li>
                }
              </ul>
            </div>
          } @else {
            <p class="muted small">Aún no hay gastos para graficar.</p>
          }
        </div>

      </section>

      <div class="grid">

        <!-- Formulario -->

        <section class="card">

          <h2>
            {{ editingId() === null ? 'Nuevo gasto' : 'Editar gasto' }}
          </h2>

          <form [formGroup]="form" (ngSubmit)="save()" novalidate>

            <label>
              Descripción

              <input
                type="text"
                formControlName="description"
                maxlength="120"
                placeholder="Ej. Almuerzo"
              />
            </label>

            @if (touched('description')) {
              <small class="field-error">
                Escribe una descripción de hasta 120 caracteres.
              </small>
            }

            <div class="two">

              <label>
                Monto (S/)

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amount"
                  placeholder="0.00"
                />
              </label>

              <label>
                Fecha

                <input
                  type="date"
                  formControlName="date"
                  [max]="maxDate"
                />
              </label>

            </div>

            @if (touched('amount')) {
              <small class="field-error">
                El monto debe ser mayor a cero.
              </small>
            }

            @if (touched('date')) {
              <small class="field-error">
                Selecciona una fecha válida que no sea futura.
              </small>
            }

            <label>
              Categoría

              <select formControlName="category">
                @for (c of categories; track c) {
                  <option [value]="c">{{ labels[c] }}</option>
                }
              </select>
            </label>

            @if (error()) {
              <p class="alert" role="alert">{{ error() }}</p>
            }

            <div class="actions">

              <button
                class="btn primary"
                type="submit"
                [disabled]="saving()"
              >
                {{
                  saving()
                    ? 'Guardando…'
                    : editingId() === null
                      ? 'Agregar'
                      : 'Guardar cambios'
                }}
              </button>

              @if (editingId() !== null) {
                <button
                  class="btn ghost"
                  type="button"
                  [disabled]="saving()"
                  (click)="cancelEdit()"
                >
                  Cancelar
                </button>
              }

            </div>
          </form>
        </section>

        <!-- Lista de gastos -->

        <section class="card">

          <div class="list-head">
            <h2>Mis gastos</h2>

            <select
              aria-label="Filtrar por categoría"
              [value]="filter()"
              (change)="setFilter($any($event.target).value)"
            >
              <option value="">Todas las categorías</option>

              @for (c of categories; track c) {
                <option [value]="c">{{ labels[c] }}</option>
              }
            </select>
          </div>

          @if (loading()) {
            <p class="muted">Cargando gastos…</p>
          } @else if (expenses().length === 0) {
            <p class="muted">
              No hay gastos todavía. Agrega el primero desde el formulario.
            </p>
          } @else {

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th class="num">Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  @for (e of expenses(); track e.id) {
                    <tr>
                      <td>{{ e.date | date:'dd/MM/yyyy' }}</td>
                      <td>{{ e.description }}</td>

                      <td>
                        <span class="tag">{{ labels[e.category] }}</span>
                      </td>

                      <td class="num">
                        {{ e.amount | currency:'PEN':'S/ ' }}
                      </td>

                      <td class="row-actions">
                        <button
                          class="link"
                          type="button"
                          [disabled]="saving()"
                          (click)="edit(e)"
                        >
                          Editar
                        </button>

                        <button
                          class="link danger"
                          type="button"
                          [disabled]="saving()"
                          (click)="remove(e)"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="pager">

              <button
                class="btn ghost"
                type="button"
                [disabled]="page() === 0 || loading()"
                (click)="goTo(page() - 1)"
              >
                ← Anterior
              </button>

              <span class="muted">
                Página {{ page() + 1 }} de {{ totalPages() || 1 }}
                · {{ totalElements() }} gastos
              </span>

              <button
                class="btn ghost"
                type="button"
                [disabled]="page() + 1 >= totalPages() || loading()"
                (click)="goTo(page() + 1)"
              >
                Siguiente →
              </button>

            </div>
          }

        </section>
      </div>
    </main>

    <app-assistant [summary]="summary()" [recent]="expenses()" />
  `,
})
export class DashboardComponent implements OnInit {

  private fb = inject(FormBuilder);
  private api = inject(ExpenseService);

  auth = inject(AuthService);

  categories = CATEGORIES;
  labels = CATEGORY_LABELS;
  maxDate = today();

  expenses = signal<Expense[]>([]);
  summary = signal<Summary | null>(null);

  page = signal(0);
  totalPages = signal(0);
  totalElements = signal(0);

  filter = signal<Category | ''>('');
  editingId = signal<number | null>(null);

  loading = signal(true);
  saving = signal(false);
  error = signal('');

  /* ---------- Resumen por categoría ---------- */

  bars = computed(() => {
    const data = this.summary()?.byCategory ?? {};

    const rows = (
      Object.entries(data) as [Category, number][]
    )
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const max = rows.length ? rows[0].amount : 0;

    return rows.map(row => ({
      ...row,
      percent: max > 0 ? (row.amount / max) * 100 : 0,
    }));
  });

  /* ---------- Gráfico de pastel ---------- */

  slices = computed(() => buildPie(this.summary()?.byCategory ?? {}));

  hovered = signal<Category | null>(null);

  activeSlice = computed(
    () => this.slices().find(slice => slice.category === this.hovered()) ?? null,
  );

  /* ---------- Formulario ---------- */

  form = this.fb.nonNullable.group({
    description: [
      '',
      [Validators.required, Validators.maxLength(120)],
    ],

    amount: [
      null as number | null,
      [Validators.required, Validators.min(0.01)],
    ],

    category: [
      'COMIDA' as Category,
      Validators.required,
    ],

    date: [
      today(),
      [Validators.required, notFutureDate],
    ],
  });

  /* ---------- Inicialización ---------- */

  ngOnInit(): void {
    this.reload();
  }

  /* ---------- Validación visual ---------- */

  touched(name: 'description' | 'amount' | 'date'): boolean {
    const control = this.form.controls[name];

    return control.invalid && control.touched;
  }

  /* ---------- Recargar datos ---------- */

  reload(): void {
    this.loadList();

    this.api.summary().subscribe({
      next: summary => {
        this.summary.set(summary);
      },
      error: err => {
        this.error.set(errorMessage(err));
      },
    });
  }

  /* ---------- Cargar lista ---------- */

  private loadList(): void {
    this.loading.set(true);

    this.api.list(this.filter(), this.page()).subscribe({
      next: res => {
        if (res.content.length === 0 && res.page > 0) {
          this.page.set(res.page - 1);
          this.loadList();
          return;
        }

        this.expenses.set(res.content);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);

        this.loading.set(false);
      },

      error: err => {
        this.loading.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  /* ---------- Filtro por categoría ---------- */

  setFilter(value: Category | ''): void {
    this.filter.set(value);
    this.page.set(0);
    this.loadList();
  }

  /* ---------- Paginación ---------- */

  goTo(p: number): void {
    if (
      p < 0 ||
      p >= this.totalPages() ||
      this.loading()
    ) {
      return;
    }

    this.page.set(p);
    this.loadList();
  }

  /* ---------- Crear o actualizar ---------- */

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    if (!value.date || value.date > today()) {
      this.form.controls.date.setErrors({ futureDate: true });
      this.form.controls.date.markAsTouched();
      return;
    }

    const body: ExpenseRequest = {
      description: value.description.trim(),
      amount: Number(value.amount),
      category: value.category,
      date: value.date,
    };

    if (!body.description) {
      this.form.controls.description.setErrors({ required: true });
      this.form.controls.description.markAsTouched();
      return;
    }

    const id = this.editingId();

    this.saving.set(true);
    this.error.set('');

    const request$ = id === null
      ? this.api.create(body)
      : this.api.update(id, body);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.reload();
      },

      error: err => {
        this.saving.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }

  /* ---------- Editar gasto ---------- */

  edit(expense: Expense): void {
    if (this.saving()) {
      return;
    }

    this.error.set('');
    this.editingId.set(expense.id);

    this.form.setValue({
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /* ---------- Cancelar edición ---------- */

  cancelEdit(): void {
    this.editingId.set(null);
    this.error.set('');

    this.form.reset({
      description: '',
      amount: null,
      category: 'COMIDA',
      date: today(),
    });
  }

  /* ---------- Eliminar gasto ---------- */

  remove(expense: Expense): void {
    if (this.saving()) {
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar "${expense.description}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.error.set('');

    this.api.delete(expense.id).subscribe({
      next: () => {
        this.reload();
      },

      error: err => {
        this.error.set(errorMessage(err));
      },
    });
  }
}
