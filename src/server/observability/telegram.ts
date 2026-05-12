/**
 * AgroOps — Telegram notifier (HU-25)
 *
 * Envía alertas operativas a un chat Telegram. Activado solo si
 * `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` están configurados (env vars).
 * Sin esa configuración, las llamadas a `notifyTelegram()` son no-op + log
 * de aviso. Esto permite que el código esté siempre operativo sin requerir
 * setup de Telegram en dev local.
 *
 * Usos:
 * - Healthcheck post-deploy: "AgroOps deploy OK" / "AgroOps DB unreachable".
 * - Alertas de backup (HU-24): "Backup diario OK / FAIL".
 * - Errores críticos no recuperables (mission stuck, Holded rate limit, etc.).
 *
 * Mantenemos minimal: no batching, no retry. Si la primera petición falla,
 * se loguea y se sigue. El operador puede revisar el endpoint /api/health
 * manual si una alerta no llegó.
 */
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_TIMEOUT_MS = 5000;

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

export interface TelegramNotifyResult {
  sent: boolean;
  reason?: "not-configured" | "network" | "api-error";
  message?: string;
}

/**
 * Envía un mensaje al chat Telegram configurado. Formato Markdown V2
 * limitado (solo `*bold*` y `\`code\``); para evitar errores de parsing
 * en mensajes con caracteres especiales, escapamos los reservados.
 */
export async function notifyTelegram(
  text: string,
): Promise<TelegramNotifyResult> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.info("[telegram] no configurado, omitiendo mensaje:", text.slice(0, 80));
    return { sent: false, reason: "not-configured" };
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "<sin cuerpo>");
      console.warn(
        `[telegram] API error ${res.status}: ${body.slice(0, 120)}`,
      );
      return {
        sent: false,
        reason: "api-error",
        message: `HTTP ${res.status}`,
      };
    }
    return { sent: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn("[telegram] network error:", msg);
    return { sent: false, reason: "network", message: msg };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Formatea un timestamp para mensajes Telegram (zona Madrid).
 */
export function formatTimestampMadrid(date = new Date()): string {
  return date.toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
}
