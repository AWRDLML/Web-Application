import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Compra } from "../entities/compra.interface";
import {AuthService} from "../../auth/services/auth.service";


@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private apiUrl = 'http://localhost:3000/compras';

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

  getCompras(): Observable<Compra[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Compra[]>(`${this.apiUrl}?usuarioId=${usuarioId}`);
  }

  getComprasByMes(year: number, month: number): Observable<Compra[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Compra[]>(`${this.apiUrl}?usuarioId=${usuarioId}`);
  }

  getCompraById(id: string): Observable<Compra> {
    return this.http.get<Compra>(`${this.apiUrl}/${id}`);
  }

  getComprasByFecha(fecha: string): Observable<Compra[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Compra[]>(`${this.apiUrl}?usuarioId=${usuarioId}&fecha=${fecha}`);
  }

  addCompra(compra: Omit<Compra, 'id' | 'usuarioId'>): Observable<Compra> {
    const usuarioId = this.getCurrentUserId();
    const compraConUsuario = { ...compra, usuarioId };
    return this.http.post<Compra>(this.apiUrl, compraConUsuario);
  }

  updateCompra(compra: Compra): Observable<Compra> {
    return this.http.put<Compra>(`${this.apiUrl}/${compra.id}`, compra);
  }

  deleteCompra(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  eliminarInsumoDeCompra(compraId: string, insumoIndex: number): Observable<Compra> {
    return this.getCompraById(compraId);
  }
}