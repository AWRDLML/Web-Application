import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Venta } from "../entities/venta.interface";
import {AuthService} from "../../auth/services/auth.service";

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  private apiUrl = 'http://localhost:3000/ventas';

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

  getVentas(): Observable<Venta[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Venta[]>(`${this.apiUrl}?usuarioId=${usuarioId}`);
  }

  getVentasByFecha(fecha: string): Observable<Venta[]> {
    const usuarioId = this.getCurrentUserId();
    return this.http.get<Venta[]>(`${this.apiUrl}?usuarioId=${usuarioId}&fecha=${fecha}`);
  }

  getVentaById(id: string): Observable<Venta> {
    return this.http.get<Venta>(`${this.apiUrl}/${id}`);
  }

  addVenta(venta: Omit<Venta, 'id' | 'usuarioId'>): Observable<Venta> {
    const usuarioId = this.getCurrentUserId();
    const ventaConUsuario = { ...venta, usuarioId };
    return this.http.post<Venta>(this.apiUrl, ventaConUsuario);
  }

  updateVenta(venta: Venta): Observable<Venta> {
    return this.http.put<Venta>(`${this.apiUrl}/${venta.id}`, venta);
  }

  deleteVenta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  existeVentaPlatoEnFecha(platoId: string, fecha: string, excludeId?: string): Observable<Venta[]> {
    const usuarioId = this.getCurrentUserId();
    let url = `${this.apiUrl}?usuarioId=${usuarioId}&platoId=${platoId}&fecha=${fecha}`;
    if (excludeId) {
      url += `&id_ne=${excludeId}`;
    }
    return this.http.get<Venta[]>(url);
  }
}