import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AssistantRequest, AssistantResponse } from './models';

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  chat(body: AssistantRequest): Observable<AssistantResponse> {
    return this.http.post<AssistantResponse>('/api/assistant/chat', body);
  }
}
