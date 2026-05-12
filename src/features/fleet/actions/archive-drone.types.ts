/**
 * AgroOps — archiveDrone action types
 *
 * Types y estado inicial separados del archivo `use server` porque Next.js 16
 * sólo permite `export async function` en archivos `"use server"`.
 */
export interface ArchiveDroneState {
  ok: boolean;
  error?: string;
}

export const initialArchiveDroneState: ArchiveDroneState = { ok: false };
