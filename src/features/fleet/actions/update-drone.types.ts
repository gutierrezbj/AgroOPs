/**
 * AgroOps — updateDrone action types
 *
 * Types y estado inicial separados del archivo `use server` porque Next.js 16
 * sólo permite `export async function` en archivos `"use server"`.
 */
export interface UpdateDroneState {
  ok: boolean;
  droneId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialUpdateDroneState: UpdateDroneState = { ok: false };
