import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Plato } from '../entities/plato.interface';
import {AuthService} from "../../auth/services/auth.service";


@Injectable({
  providedIn: 'root'
})
export class PlatosService {
  private apiUrl = 'http://localhost:3000/platos';

  constructor(
      private http: HttpClient,
      private authService: AuthService
  ) {}

  private getCurrentUserId(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    return userId;
  }

  getPlatos(): Observable<Plato[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Plato[]>(`${this.apiUrl}?usuarioId=${usuarioId}`);
  }

  getPlatoById(id: string): Observable<Plato> {
    return this.http.get<Plato>(`${this.apiUrl}/${id}`);
  }

  addPlato(plato: Omit<Plato, 'id' | 'usuarioId'>): Observable<Plato> {
    const usuarioId = this.getCurrentUserId();
    const platoConUsuario = { ...plato, usuarioId };
    return this.http.post<Plato>(this.apiUrl, platoConUsuario);
  }

  updatePlato(plato: Plato): Observable<Plato> {
    return this.http.put<Plato>(`${this.apiUrl}/${plato.id}`, plato);
  }

  deletePlato(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  existePlatoConNombre(nombre: string, excludeId?: string): Observable<Plato[]> {
    const usuarioId = this.getCurrentUserId();
    let url = `${this.apiUrl}?usuarioId=${usuarioId}&nombre=${encodeURIComponent(nombre)}`;
    if (excludeId) {
      url += `&id_ne=${excludeId}`;
    }
    return this.http.get<Plato[]>(url);
  }
}