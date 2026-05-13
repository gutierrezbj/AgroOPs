#!/usr/bin/env bash
#
# AgroOps — Lighthouse audit (Sprint 5)
#
# Ejecuta Lighthouse CI sobre las pantallas productivas y guarda los reportes
# en `storage/lighthouse/<timestamp>/`. Útil para:
# - Medir baseline antes de la primera operación real.
# - Detectar regresiones en performance/accessibility/best-practices/SEO.
# - Documentar evolución de Lighthouse score a lo largo del tiempo.
#
# Requisitos:
# - Chrome o Chromium en el PATH (en CI usar `setup-chrome` action).
# - `pnpm dev` corriendo en localhost:3000 (o pasar BASE_URL).
# - Sesión admin para las pantallas autenticadas (las URLs de dashboard
#   requieren cookie; en v1.0 sólo medimos /login y /api/health públicos).
#
# Variables:
#   BASE_URL            default http://localhost:3000
#   LH_OUT_DIR          default ./storage/lighthouse
#   LH_THRESHOLD_PERF   umbral mínimo performance (default 90)
#
# Notas:
# - Lighthouse se instala on-demand vía npx para no añadir 100MB+ al
#   devDependencies. La primera ejecución descarga ~30MB.
# - Para auditar pantallas autenticadas, en v1.1 añadiremos un puppeteer
#   script que loguee primero. v1.0 mide sólo público.

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
LH_OUT_DIR="${LH_OUT_DIR:-./storage/lighthouse}"
LH_THRESHOLD_PERF="${LH_THRESHOLD_PERF:-90}"

TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
OUT_DIR="${LH_OUT_DIR}/${TIMESTAMP}"
mkdir -p "$OUT_DIR"

# Pantallas a auditar (públicas en v1.0)
URLS=(
  "${BASE_URL}/login"
)

echo "[lighthouse] BASE_URL=${BASE_URL}"
echo "[lighthouse] Salida → ${OUT_DIR}"
echo "[lighthouse] Umbral performance ≥ ${LH_THRESHOLD_PERF}"
echo ""

# Verificar que el servidor responde
if ! curl -sSf "${BASE_URL}/api/health" >/dev/null; then
  echo "ERROR: ${BASE_URL}/api/health no responde. ¿Está corriendo \`pnpm dev\`?"
  exit 1
fi

FAILED=0
SUMMARY="${OUT_DIR}/summary.md"
echo "# Lighthouse audit — ${TIMESTAMP}" > "$SUMMARY"
echo "" >> "$SUMMARY"
echo "Base URL: \`${BASE_URL}\`" >> "$SUMMARY"
echo "Umbral performance: ≥ ${LH_THRESHOLD_PERF}" >> "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| URL | Performance | Accessibility | Best Practices | SEO |" >> "$SUMMARY"
echo "|---|---|---|---|---|" >> "$SUMMARY"

for url in "${URLS[@]}"; do
  SLUG="$(echo "$url" | sed 's/[^a-zA-Z0-9]/_/g')"
  REPORT_HTML="${OUT_DIR}/${SLUG}.html"
  REPORT_JSON="${OUT_DIR}/${SLUG}.json"

  echo "[lighthouse] Auditando: $url"

  npx --yes lighthouse "$url" \
    --output=html --output=json \
    --output-path="${OUT_DIR}/${SLUG}" \
    --chrome-flags="--headless=new --no-sandbox" \
    --quiet \
    || { echo "  ✗ lighthouse falló para $url"; FAILED=1; continue; }

  if [ ! -f "$REPORT_JSON" ]; then
    echo "  ✗ Reporte JSON no generado"
    FAILED=1
    continue
  fi

  PERF=$(node -e "const r=require('${REPORT_JSON}'); console.log(Math.round(r.categories.performance.score*100))")
  A11Y=$(node -e "const r=require('${REPORT_JSON}'); console.log(Math.round(r.categories.accessibility.score*100))")
  BP=$(node -e "const r=require('${REPORT_JSON}'); console.log(Math.round(r.categories['best-practices'].score*100))")
  SEO=$(node -e "const r=require('${REPORT_JSON}'); console.log(Math.round(r.categories.seo.score*100))")

  echo "  → Performance: ${PERF} · A11y: ${A11Y} · Best Practices: ${BP} · SEO: ${SEO}"
  echo "| \`${url}\` | ${PERF} | ${A11Y} | ${BP} | ${SEO} |" >> "$SUMMARY"

  if [ "$PERF" -lt "$LH_THRESHOLD_PERF" ]; then
    echo "  ⚠ Performance ${PERF} < umbral ${LH_THRESHOLD_PERF}"
    FAILED=1
  fi
done

echo ""
echo "[lighthouse] Resumen en: ${SUMMARY}"
echo "[lighthouse] Reportes HTML en: ${OUT_DIR}/"
exit "$FAILED"
