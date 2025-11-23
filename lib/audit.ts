// lib/audit.ts
import { supabase } from './supabase/client';

/**
 * Sistema de Auditoría - Registra cambios críticos en el sistema
 * 
 * Acciones auditables:
 * - CREATE: Crear nuevo registro
 * - UPDATE: Modificar registro existente
 * - DELETE: Eliminar registro
 * - LINK: Vincular registros (ej: niño con cuidador)
 * - UNLINK: Desvincular registros
 * - CLOSE_ALERT: Cerrar alerta
 * - CANCEL_APPOINTMENT: Cancelar cita
 */

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LINK' 
  | 'UNLINK' 
  | 'CLOSE_ALERT' 
  | 'CANCEL_APPOINTMENT'
  | 'CONFIRM_APPOINTMENT';

interface AuditLog {
  tabla: string;
  accion: AuditAction;
  registro_id?: string;
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  usuario_id?: string;
}

/**
 * Registra un evento en el log de auditoría
 */
export const registrarAuditoria = async (log: AuditLog) => {
  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ Intento de auditoría sin usuario autenticado');
      return;
    }

    // Preparar payload
    const payload = {
      tabla: log.tabla,
      accion: log.accion,
      registro_id: log.registro_id || null,
      descripcion: log.descripcion,
      datos_anteriores: log.datos_anteriores ? JSON.stringify(log.datos_anteriores) : null,
      datos_nuevos: log.datos_nuevos ? JSON.stringify(log.datos_nuevos) : null,
      usuario_id: user.id,
      timestamp: new Date().toISOString()
    };

    // Insertar en tabla de eventos
    const { error } = await supabase
      .from('tbl_eventos_sync')
      .insert([payload]);

    if (error) {
      console.error('❌ Error al registrar auditoría:', error);
    } else {
      console.log('✅ Evento auditado:', log.accion, log.tabla);
    }
  } catch (err) {
    console.error('❌ Error inesperado en auditoría:', err);
  }
};

/**
 * Helpers específicos para acciones comunes
 */

export const auditarCreacion = async (tabla: string, registroId: string, datos: any) => {
  await registrarAuditoria({
    tabla,
    accion: 'CREATE',
    registro_id: registroId,
    descripcion: `Nuevo registro creado en ${tabla}`,
    datos_nuevos: datos
  });
};

export const auditarActualizacion = async (
  tabla: string, 
  registroId: string, 
  datosAnteriores: any, 
  datosNuevos: any
) => {
  await registrarAuditoria({
    tabla,
    accion: 'UPDATE',
    registro_id: registroId,
    descripcion: `Registro actualizado en ${tabla}`,
    datos_anteriores: datosAnteriores,
    datos_nuevos: datosNuevos
  });
};

export const auditarEliminacion = async (tabla: string, registroId: string, datos: any) => {
  await registrarAuditoria({
    tabla,
    accion: 'DELETE',
    registro_id: registroId,
    descripcion: `Registro eliminado de ${tabla}`,
    datos_anteriores: datos
  });
};

export const auditarVinculacion = async (ninoId: string, cuidadorEmail: string) => {
  await registrarAuditoria({
    tabla: 'tbl_ninos_cuidadores',
    accion: 'LINK',
    registro_id: ninoId,
    descripcion: `Niño vinculado con cuidador ${cuidadorEmail}`,
    datos_nuevos: { nino_id: ninoId, cuidador_email: cuidadorEmail }
  });
};

export const auditarDesvinculacion = async (ninoId: string, cuidadorEmail: string) => {
  await registrarAuditoria({
    tabla: 'tbl_ninos_cuidadores',
    accion: 'UNLINK',
    registro_id: ninoId,
    descripcion: `Cuidador ${cuidadorEmail} desvinculado del niño`,
    datos_anteriores: { nino_id: ninoId, cuidador_email: cuidadorEmail }
  });
};

export const auditarCierreAlerta = async (alertaId: string, nota: string) => {
  await registrarAuditoria({
    tabla: 'tbl_alertas',
    accion: 'CLOSE_ALERT',
    registro_id: alertaId,
    descripcion: `Alerta cerrada: ${nota}`,
    datos_nuevos: { nota_cierre: nota }
  });
};

export const auditarCancelacionCita = async (citaId: string, motivoCancelacion?: string) => {
  await registrarAuditoria({
    tabla: 'tbl_citas',
    accion: 'CANCEL_APPOINTMENT',
    registro_id: citaId,
    descripcion: motivoCancelacion || 'Cita cancelada por el médico',
    datos_nuevos: { estado: 'CANCELADA' }
  });
};