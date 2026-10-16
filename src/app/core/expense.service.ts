import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, Expense, ExpenseRequest, PageResponse, Summary } from './models';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private http = inject(HttpClient);
  private url = '/api/expenses';

  list(category: Category | '', page: number, size = 8): Observable<PageResponse<Expense>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (category) params = params.set('category', category);
    return this.http.get<PageResponse<Expense>>(this.url, { params });
  }

  summary(): Observable<Summary> {
    return this.http.get<Summary>(`${this.url}/summary`);
  }

  create(body: ExpenseRequest): Observable<Expense> {
    return this.http.post<Expense>(this.url, body);
  }

  update(id: number, body: ExpenseRequest): Observable<Expense> {
    return this.http.put<Expense>(`${this.url}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
