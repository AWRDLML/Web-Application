import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {AuthService} from "../../../services/auth.service";

@Component({
  selector: 'app-recover',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './recover.component.html',
  styleUrl: './recover.component.css'
})
export class RecoverComponent {
  private recoverySubscription?: Subscription;
  recoverForm!: FormGroup;
  // Propiedades del formulario
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  emailSent: boolean = false;

  // Timer para reenvío
  resendTimer: number = 0;
  resendInterval: any;


  constructor(
      private router: Router,
      private fb: FormBuilder,
      private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.recoverForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get email(): AbstractControl {
    return this.recoverForm.get('email')!;
  }


  // Manejar envío del formulario
  onSubmit(): void {
    if (this.recoverForm.invalid) {
      this.recoverForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const emailValue = this.email.value;

    this.recoverySubscription = this.authService.emailExists(emailValue).subscribe({
      next: (exists) => {
        if (exists) {
          // Si el email existe, simulamos el envío exitoso
          this.emailSent = true;
          this.successMessage = `Se ha enviado un enlace de recuperación a ${emailValue}. Revisa tu bandeja de entrada y spam.`;
          this.startResendTimer();
        } else {
          // Si el email no existe, mostramos un error
          this.errorMessage = 'No encontramos una cuenta asociada a este correo electrónico.';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Ocurrió un error al verificar el correo. Inténtalo más tarde.';
        this.isLoading = false;
      }
    });
  }


  // Iniciar timer para reenvío
  startResendTimer(): void {
    this.resendTimer = 60;
    this.resendInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  // Reenviar email
  resendEmail(): void {
    if (this.resendTimer > 0) return;

    this.isLoading = true;
    this.errorMessage = '';

    setTimeout(() => {
      this.successMessage = `Se ha reenviado el enlace de recuperación a ${this.email.value}.`;
      this.startResendTimer();
      this.isLoading = false;
    }, 1500);
  }

  // Volver al formulario inicial
  resetForm(): void {
    this.recoverForm.reset();
    this.emailSent = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.resendTimer = 0;
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  // Navegar a login
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Navegar a registro
  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  // Limpiar interval al destruir componente
  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    this.recoverySubscription?.unsubscribe();
  }
}