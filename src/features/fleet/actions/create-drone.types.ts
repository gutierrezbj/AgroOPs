/**
 * AgroOps — createDrone action types
 *
 * Types y estado inicial separados del archivo `use server` porque Next.js 16
 * sólo permite `export async function` en archivos `"use server"`.
 */
export interface CreateDroneState {
  ok: boolean;
  drone?: { id: string; model: string; serialNumber: string };
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const initialCreateDroneState: CreateDroneState = { ok: false };
