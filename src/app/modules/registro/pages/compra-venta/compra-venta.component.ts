import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {Venta} from "../../entities/venta.interface";
import {Plato} from "../../../platos/entities/plato.interface";
import {Compra} from "../../entities/compra.interface";
import {VentasService} from "../../services/ventas.service";
import {ComprasService} from "../../services/compras.service";
import {PlatosService} from "../../../platos/services/platos.service";
import {AuthService} from "../../../auth/services/auth.service";


@Component({
  selector: 'app-compra-venta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './compra-venta.component.html',
  styleUrl: './compra-venta.component.css'
})
export class CompraVentaComponent implements OnInit {
  // Variables para Ventas
  fechaSeleccionadaVentas: string = '';
  ventasDelDia: Venta[] = [];
  platos: Plato[] = [];
  platosDisponibles: Plato[] = [];
  mostrarFormularioVenta: boolean = false;
  editandoVenta: boolean = false;
  ventaActual: Partial<Venta> = {};

  // Variables para Compras
  mesSeleccionado: number;
  anioSeleccionado: number;
  comprasDelMes: Compra[] = [];
  fechasExpandidas: Set<string> = new Set();
  mostrarFormularioCompra: boolean = false;
  editandoCompra: boolean = false;
  unidades = ['kg', 'g', 'unid'];
  opcionesCantidad = [
    { valor: 0.125, texto: '1/8' },
    { valor: 0.25, texto: '1/4' },
    { valor: 0.5, texto: '1/2' },
    { valor: 0.75, texto: '3/4' },
    { valor: 1, texto: '1' },
    { valor: 'manual', texto: 'Especificar cantidad' }
  ];

  compraForm!: FormGroup;

  // Mensajes y estados
  mensajeVentas: string = '';
  mensajeCompras: string = '';
  cargandoVentas: boolean = false;
  cargandoCompras: boolean = false;

  constructor(
      private ventasService: VentasService,
      private comprasService: ComprasService,
      private platosService: PlatosService,
      private authService: AuthService,
      private fb: FormBuilder


  ) {
    this.compraForm = this.fb.group({});
    const hoy = new Date();
    this.fechaSeleccionadaVentas = this.formatearFechaInput(hoy);
    this.mesSeleccionado = hoy.getMonth() + 1;
    this.anioSeleccionado = hoy.getFullYear();

    console.log('Inicialización:', {
      fechaVentas: this.fechaSeleccionadaVentas,
      mes: this.mesSeleccionado,
      año: this.anioSeleccionado
    });
  }



  ngOnInit(): void {
    this.compraForm = this.fb.group({});
    this.cargarPlatos();
    this.cargarVentasDelDia();
    this.cargarComprasDelMes();
  }

  // MÉTODOS PARA VENTAS
  cargarPlatos(): void {
    this.platosService.getPlatos().subscribe({
      next: (platos) => {
        this.platos = platos;
        this.actualizarPlatosDisponibles();
      },
      error: (error) => {
        console.error('Error al cargar platos:', error);
        this.mensajeVentas = 'Error al cargar los platos disponibles';
      }
    });
  }

  onFechaVentasChange(): void {
    this.cargarVentasDelDia();
    this.cerrarFormularioVenta();
  }

  cargarVentasDelDia(): void {
    if (!this.fechaSeleccionadaVentas) return;

    this.cargandoVentas = true;
    this.ventasService.getVentasByFecha(this.fechaSeleccionadaVentas).subscribe({
      next: (ventas) => {
        this.ventasDelDia = ventas.map(venta => {
          const plato = this.platos.find(p => p.id === venta.platoId);
          return { ...venta, plato: plato?.nombre || 'Plato no encontrado' };
        });
        this.actualizarPlatosDisponibles();
        this.mensajeVentas = this.ventasDelDia.length === 0 ?
            'No se han registrado ventas aún para esta fecha' : '';
        this.cargandoVentas = false;
      },
      error: (error) => {
        console.error('Error al cargar ventas:', error);
        this.mensajeVentas = 'Error al cargar las ventas';
        this.cargandoVentas = false;
      }
    });
  }

  actualizarPlatosDisponibles(): void {
    const platosVendidos = this.ventasDelDia.map(v => v.platoId);
    this.platosDisponibles = this.platos.filter(plato =>
        !platosVendidos.includes(plato.id)
    );
  }

  abrirFormularioVenta(): void {
    if (this.platos.length === 0) {
      this.mensajeVentas = 'No hay platos registrados aún';
      return;
    }
    this.mostrarFormularioVenta = true;
    this.editandoVenta = false;
    this.ventaActual = {
      fecha: this.fechaSeleccionadaVentas,
      platoId: undefined,
      cantidad: 1
    };
  }

  editarVenta(venta: Venta): void {
    this.mostrarFormularioVenta = true;
    this.editandoVenta = true;
    this.ventaActual = { ...venta };
  }

  cerrarFormularioVenta(): void {
    this.mostrarFormularioVenta = false;
    this.editandoVenta = false;
    this.ventaActual = {};
  }

  guardarVenta(): void {
    if (!this.validarVenta()) return;

    const usuarioId = this.authService.getCurrentUserId();
    if (!usuarioId) {
      this.mensajeVentas = 'No se pudo determinar el usuario actual';
      return;
    }

    const ventaData: Venta = {
      id: this.ventaActual.id ?? crypto.randomUUID(),
      usuarioId,
      fecha: this.fechaSeleccionadaVentas,
      platoId: this.ventaActual.platoId!,
      cantidad: this.ventaActual.cantidad!
    };

    if (this.editandoVenta) {
      this.ventasService.updateVenta(ventaData).subscribe({
        next: () => {
          this.cargarVentasDelDia();
          this.cerrarFormularioVenta();
          this.mensajeVentas = 'Venta actualizada correctamente';
        },
        error: (error) => {
          console.error('Error al actualizar venta:', error);
          this.mensajeVentas = 'Error al actualizar la venta';
        }
      });
    } else {
      this.ventasService.addVenta(ventaData).subscribe({
        next: () => {
          this.cargarVentasDelDia();
          this.cerrarFormularioVenta();
          this.mensajeVentas = 'Venta registrada correctamente';
        },
        error: (error) => {
          console.error('Error al registrar venta:', error);
          this.mensajeVentas = 'Error al registrar la venta';
        }
      });
    }
  }

  validarVenta(): boolean {
    if (!this.ventaActual.platoId) {
      this.mensajeVentas = 'Debe seleccionar un plato';
      return false;
    }
    if (!this.ventaActual.cantidad || this.ventaActual.cantidad <= 0) {
      this.mensajeVentas = 'La cantidad debe ser mayor a 0';
      return false;
    }
    return true;
  }

  eliminarVenta(venta: Venta): void {
    if (confirm(`¿Está seguro de eliminar la venta de ${venta.plato}?`)) {
      this.ventasService.deleteVenta(venta.id).subscribe({
        next: () => {
          this.cargarVentasDelDia();
          this.mensajeVentas = 'Venta eliminada correctamente';
        },
        error: (error) => {
          console.error('Error al eliminar venta:', error);
          this.mensajeVentas = 'Error al eliminar la venta';
        }
      });
    }
  }

  // MÉTODOS PARA COMPRAS
  onMesComprasChange(): void {
    console.log('=== CAMBIO MES/AÑO ===');
    console.log('Mes antes de conversión:', this.mesSeleccionado, 'tipo:', typeof this.mesSeleccionado);
    console.log('Año antes de conversión:', this.anioSeleccionado, 'tipo:', typeof this.anioSeleccionado);

    this.mesSeleccionado = Number(this.mesSeleccionado);
    this.anioSeleccionado = Number(this.anioSeleccionado);

    console.log('Mes después de conversión:', this.mesSeleccionado, 'tipo:', typeof this.mesSeleccionado);
    console.log('Año después de conversión:', this.anioSeleccionado, 'tipo:', typeof this.anioSeleccionado);

    this.cargarComprasDelMes();
    this.cerrarFormularioCompra();
    this.fechasExpandidas.clear();
  }

  onMesChange(): void {
    console.log('Cambio de mes a:', this.mesSeleccionado);
    this.onMesComprasChange();
  }

  onAnioChange(): void {
    console.log('Cambio de año a:', this.anioSeleccionado);
    this.onMesComprasChange();
  }


  cargarComprasDelMes(): void {
    console.log('=== INICIANDO CARGA COMPRAS ===');
    console.log('Buscando compras para:', this.obtenerNombreMes(this.mesSeleccionado), this.anioSeleccionado);
    console.log('Mes seleccionado (número):', this.mesSeleccionado, 'tipo:', typeof this.mesSeleccionado);
    console.log('Año seleccionado (número):', this.anioSeleccionado, 'tipo:', typeof this.anioSeleccionado);

    this.cargandoCompras = true;
    this.mensajeCompras = '';

    this.comprasService.getCompras().subscribe({
      next: (todasLasCompras) => {
        console.log('=== DATOS RECIBIDOS ===');
        console.log('Total compras en BD:', todasLasCompras.length);

        this.comprasDelMes = todasLasCompras.filter(compra => {
          console.log(`\n--- Procesando compra ID: ${compra.id} ---`);
          console.log('Fecha original:', compra.fecha);

          const fechaPartes = compra.fecha.split('-');
          const anioCompra = parseInt(fechaPartes[0]);
          const mesCompra = parseInt(fechaPartes[1]);

          console.log('Fecha parseada:', {
            mesCompra,
            anioCompra,
            mesSeleccionado: this.mesSeleccionado,
            anioSeleccionado: this.anioSeleccionado
          });

          const coincideMes = mesCompra === this.mesSeleccionado;
          const coincideAnio = anioCompra === this.anioSeleccionado;
          const coincide = coincideMes && coincideAnio;

          console.log('Resultado comparación:', {
            coincideMes,
            coincideAnio,
            coincide
          });

          return coincide;
        });

        console.log('=== RESULTADOS FINALES ===');
        console.log('Compras filtradas:', this.comprasDelMes.length);
        console.log('IDs de compras filtradas:', this.comprasDelMes.map(c => c.id));

        this.comprasDelMes.sort((a, b) => {
          return b.fecha.localeCompare(a.fecha);
        });

        this.mensajeCompras = this.comprasDelMes.length === 0 ?
            `No hay compras registradas para ${this.obtenerNombreMes(this.mesSeleccionado)} ${this.anioSeleccionado}` : '';

        this.cargandoCompras = false;
        console.log('=== CARGA COMPRAS COMPLETADA ===\n');
      },
      error: (error) => {
        console.error('Error al cargar compras:', error);
        this.mensajeCompras = 'Error al cargar las compras';
        this.cargandoCompras = false;
      }
    });
  }

  toggleFechaExpansion(fecha: string): void {
    if (this.fechasExpandidas.has(fecha)) {
      this.fechasExpandidas.delete(fecha);
    } else {
      this.fechasExpandidas.add(fecha);
    }
  }

  esFechaExpandida(fecha: string): boolean {
    return this.fechasExpandidas.has(fecha);
  }

  obtenerComprasPorFecha(fecha: string): Compra[] {
    return this.comprasDelMes.filter(compra => compra.fecha === fecha);
  }

  obtenerFechasUnicas(): string[] {
    const fechas = [...new Set(this.comprasDelMes.map(compra => compra.fecha))];
    return fechas.sort((a, b) => {
      const fechaA = new Date(a + 'T00:00:00.000Z');
      const fechaB = new Date(b + 'T00:00:00.000Z');
      return fechaB.getTime() - fechaA.getTime();
    });
  }

  calcularTotalFecha(fecha: string): number {
    const comprasFecha = this.obtenerComprasPorFecha(fecha);
    return comprasFecha.reduce((total, compra) => {
      return total + compra.insumos.reduce((subtotal, insumo) => subtotal + insumo.costoTotal, 0);
    }, 0);
  }

  calcularTotalMes(): number {
    return this.comprasDelMes.reduce((total, compra) => {
      return total + compra.insumos.reduce((subtotal, insumo) => subtotal + insumo.costoTotal, 0);
    }, 0);
  }


  agregarInsumo(): void {
    this.insumosFormArray.push(this.createInsumoCompraForm());
    this.onUnidadChangeCompra(this.insumosFormArray.length - 1);
  }

  eliminarInsumo(index: number): void {
    if (this.insumosFormArray.length > 1) {
      this.insumosFormArray.removeAt(index);
    }
  }


  get insumosFormArray(): FormArray {
    return this.compraForm.get('insumos') as FormArray;
  }


  createCompraForm(compra?: Compra): FormGroup {
    const hoy = new Date();
    const fechaDefecto = new Date(this.anioSeleccionado, this.mesSeleccionado - 1, hoy.getDate());

    if (fechaDefecto.getMonth() + 1 !== this.mesSeleccionado) {
      fechaDefecto.setDate(1);
    }

    const fechaFormateada = this.formatearFechaInput(fechaDefecto);

    const form = this.fb.group({
      id: [compra?.id || null],
      fecha: [compra?.fecha || fechaFormateada, Validators.required],
      insumos: this.fb.array([]) // Empezamos con el array vacío
    });

    const insumosFormArray = form.get('insumos') as FormArray;
    if (compra && compra.insumos && compra.insumos.length > 0) {
      compra.insumos.forEach(insumo => {
        let cantidadMostrada = insumo.cantidad;
        if(insumo.unidad === 'g') {
          cantidadMostrada = insumo.cantidad * 1000;
        } else if(insumo.unidad === 'unid' && insumo.pesoAprox) {
          cantidadMostrada = insumo.cantidad / insumo.pesoAprox;
        }

        const insumoFormGroup = this.createInsumoCompraForm({
          ...insumo,
          cantidad: cantidadMostrada
        });
        insumosFormArray.push(insumoFormGroup);
      });
    } else {
      insumosFormArray.push(this.createInsumoCompraForm());
    }

    return form;
  }

  createInsumoCompraForm(insumo?: any): FormGroup {
    const pesoAproxEnGramos = insumo?.pesoAprox ? insumo.pesoAprox * 1000 : '';

    return this.fb.group({
      nombre: [insumo?.nombre || '', Validators.required],
      cantidad: [insumo?.cantidad || '', [Validators.required, Validators.min(0.001)]],
      unidad: [insumo?.unidad || 'kg', Validators.required],
      costoTotal: [insumo?.costoTotal || '', [Validators.required, Validators.min(0.01)]],
      pesoAprox: [pesoAproxEnGramos, []]
    });
  }

  abrirFormularioCompra(): void {
    this.mostrarFormularioCompra = true;
    this.editandoCompra = false;
    this.compraForm = this.createCompraForm();
  }

  editarCompra(compra: Compra): void {
    this.mostrarFormularioCompra = true;
    this.editandoCompra = true;
    this.compraForm = this.createCompraForm(compra);
  }

  cerrarFormularioCompra(): void {
    this.mostrarFormularioCompra = false;
    this.editandoCompra = false;
    this.compraForm.reset();
  }

  guardarCompra(): void {
    if (this.compraForm.invalid) {
      this.mensajeCompras = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    const usuarioId = this.authService.getCurrentUserId();
    if (!usuarioId) {
      this.mensajeCompras = 'No se pudo determinar el usuario actual';
      return;
    }

    const formValue = this.compraForm.value;

    const compraData: Compra = {
      id: formValue.id || crypto.randomUUID(),
      usuarioId,
      fecha: formValue.fecha,
      insumos: formValue.insumos.map((insumo: any) => {
        // La cantidad base es la que el usuario ingresa
        const cantidadOriginal = Number(insumo.cantidad);
        const unidad = insumo.unidad;

        let cantidadEnKg: number;
        const pesoAproxEnKg = insumo.pesoAprox ? Number(insumo.pesoAprox) / 1000 : 0;

        switch (unidad) {
          case 'g':
            cantidadEnKg = cantidadOriginal / 1000;
            break;
          case 'unid':
            cantidadEnKg = cantidadOriginal * pesoAproxEnKg;
            break;
          case 'kg':
          default:
            cantidadEnKg = cantidadOriginal;
            break;
        }

        const insumoFinal = {
          nombre: insumo.nombre,
          cantidad: cantidadEnKg,
          unidad: unidad,
          costoTotal: Number(insumo.costoTotal)
        };

        if (unidad === 'unid') {
          (insumoFinal as any).pesoAprox = pesoAproxEnKg;
        }

        return insumoFinal;
      }).filter((insumo: any) => insumo.nombre.trim() !== '')
    };

    if (compraData.insumos.length === 0) {
      this.mensajeCompras = 'Debe agregar al menos un insumo válido.';
      return;
    }

    const request$ = this.editandoCompra
        ? this.comprasService.updateCompra(compraData)
        : this.comprasService.addCompra(compraData);



    request$.subscribe({
      next: () => {
        const fechaCompra = new Date(formValue.fecha + 'T00:00:00');
        this.mesSeleccionado = fechaCompra.getMonth() + 1;
        this.anioSeleccionado = fechaCompra.getFullYear();

        this.cargarComprasDelMes();
        this.cerrarFormularioCompra();
        this.mensajeCompras = this.editandoCompra
            ? 'Compra actualizada correctamente'
            : 'Compra registrada correctamente';
      },
      error: (error) => {
        console.error('Error al guardar/actualizar compra:', error);
        this.mensajeCompras = this.editandoCompra
            ? 'Error al actualizar la compra'
            : 'Error al registrar la compra';
      }
    });
  }


  onUnidadChangeCompra(index: number): void {
    const insumoControl = this.insumosFormArray.at(index) as FormGroup;
    const unidad = insumoControl.get('unidad')?.value;
    const pesoAproxControl = insumoControl.get('pesoAprox');

    pesoAproxControl?.clearValidators();
    pesoAproxControl?.setValue('');

    if (unidad === 'unid') {
      pesoAproxControl?.setValidators([Validators.required, Validators.min(1)]);
    }

    pesoAproxControl?.updateValueAndValidity();
  }


  eliminarCompra(compra: Compra): void {
    if (confirm('¿Está seguro de eliminar esta compra?')) {
      this.comprasService.deleteCompra(compra.id).subscribe({
        next: () => {
          this.cargarComprasDelMes();
          this.mensajeCompras = 'Compra eliminada correctamente';
        },
        error: (error) => {
          console.error('Error al eliminar compra:', error);
          this.mensajeCompras = 'Error al eliminar la compra';
        }
      });
    }
  }

  // Métodos auxiliares
  formatearFecha(fecha: string): string {
    try {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
    } catch (error) {
      console.error('Error al formatear fecha:', fecha, error);
      return fecha;
    }
  }

  formatearMoneda(valor: number): string {
    return `S/. ${valor.toFixed(2)}`;
  }

  obtenerNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || '';
  }

  formatearFechaInput(fecha: Date): string {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }


  mostrarCantidadCompra(insumo: any): string {
    if (!insumo) return '';

    const pesoTotalKg = insumo.cantidad;

    switch (insumo.unidad) {
      case 'unid':

        if (insumo.pesoAprox && insumo.pesoAprox > 0) {
          const cantidadUnidades = pesoTotalKg / insumo.pesoAprox;
          return `${cantidadUnidades.toFixed(0)} unid`;
        }
        return `(unidades)`;

      case 'g':
        const cantidadGramos = pesoTotalKg * 1000;
        return `${cantidadGramos} g`;

      case 'kg':
      default:
        return `${pesoTotalKg} kg`;
    }
  }

  // Para verificar en consola si se manejan los datos correctamente

  verificarDatos(): void {
    console.log('=== DEBUG COMPRAS ===');
    console.log('Mes seleccionado:', this.mesSeleccionado);
    console.log('Año seleccionado:', this.anioSeleccionado);
    console.log('Total compras del mes:', this.comprasDelMes.length);
    console.log('Fechas únicas:', this.obtenerFechasUnicas());
    this.comprasDelMes.forEach((compra, index) => {
      console.log(`Compra ${index + 1}:`, {
        id: compra.id,
        fecha: compra.fecha,
        insumos: compra.insumos.length
      });
    });
  }



  verificarDatosCompras(): void {
    console.log('=== VERIFICACIÓN MANUAL DE DATOS ===');
    console.log('Estado actual del componente:');
    console.log('- Mes seleccionado:', this.mesSeleccionado, '(tipo:', typeof this.mesSeleccionado, ')');
    console.log('- Año seleccionado:', this.anioSeleccionado, '(tipo:', typeof this.anioSeleccionado, ')');
    console.log('- Total compras cargadas:', this.comprasDelMes.length);

    this.comprasService.getCompras().subscribe(compras => {
      console.log('Datos directos del servicio:');
      console.log('- Total compras en BD:', compras.length);
      console.log('- Fechas disponibles:', compras.map(c => c.fecha).sort());

      if (compras.length > 0) {
        const primeraCompra = compras[0];
        console.log('Estructura de la primera compra:', {
          id: primeraCompra.id,
          fecha: primeraCompra.fecha,
          tipoFecha: typeof primeraCompra.fecha,
          insumos: primeraCompra.insumos.length
        });
      }
    });
  }
}