import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

export interface Usuario {
    id: string;
    restaurantName: string;
    email: string;
    password: string;
    createdAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    restaurantName: string;
    email: string;
    password: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/usuarios';
    private currentUserSubject = new BehaviorSubject<Usuario | null>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadCurrentUser();
    }

    // Cargar usuario actual del localStorage
    private loadCurrentUser(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUserSubject.next(JSON.parse(userData));
            }
        }
    }

    // Obtener usuario actual
    getCurrentUser(): Usuario | null {
        return this.currentUserSubject.value;
    }

    // Obtener ID del usuario actual
    getCurrentUserId(): string | null {
        const user = this.getCurrentUser();
        return user ? user.id : localStorage.getItem('userId');
    }

    // Verificar si está autenticado
    isAuthenticated(): boolean {
        return this.getCurrentUser() !== null;
    }

    // Login
    login(credentials: LoginRequest): Observable<Usuario | null> {
        return this.http.get<Usuario[]>(`${this.apiUrl}?email=${credentials.email}&password=${credentials.password}`)
            .pipe(
                map(users => {
                    if (users.length > 0) {
                        const user = users[0];
                        this.setCurrentUser(user);
                        return user;
                    }
                    return null;
                }),
                catchError(() => of(null))
            );
    }

    // Registro
    register(userData: RegisterRequest): Observable<Usuario | null> {
        return this.http.get<Usuario[]>(`${this.apiUrl}?email=${userData.email}`)
            .pipe(
                switchMap(existingUsers => {
                    if (existingUsers.length > 0) {
                        return of(null);
                    }

                    const newUser: Omit<Usuario, 'id'> = {
                        ...userData,
                        createdAt: new Date().toISOString()
                    };

                    return this.http.post<Usuario>(this.apiUrl, newUser).pipe(
                        tap(createdUser => {
                            this.setCurrentUser(createdUser);
                        })
                    );
                }),
                catchError(error => {
                    console.error('Error en el registro:', error);
                    return of(null);
                })
            );
    }

    // Verificar si email existe
    emailExists(email: string): Observable<boolean> {
        return this.http.get<Usuario[]>(`${this.apiUrl}?email=${email}`)
            .pipe(
                map(users => users.length > 0),
                catchError(this.handleError)
            );
    }

    // Logout
    logout(): void {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        this.currentUserSubject.next(null);
    }

    private setCurrentUser(user: Usuario): void {
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('isLoggedIn', 'true');
        this.currentUserSubject.next(user);
    }

    // Helper para manejar errores de HTTP
    private handleError(error: any): Observable<never> {
        console.error('Ocurrió un error en la petición:', error);
        return throwError(() => new Error('Algo salió mal; por favor, inténtalo de nuevo más tarde.'));
    }
}