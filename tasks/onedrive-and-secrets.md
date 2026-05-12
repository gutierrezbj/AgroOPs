# Higiene del entorno local — OneDrive sync + secretos

Acciones que tienes que hacer tú a mano (no las puedo automatizar con confianza desde un agente). Las dejo aquí para que las encuentres y las cierres en orden.

---

## 1. Excluir del sync OneDrive (alta prioridad)

OneDrive intentará sincronizar `node_modules/`, `.next/`, `.pnpm-store/` y similares — son 10k–30k archivos que se reescriben constantemente. Síntomas si no lo arreglas:
- macOS muestra el spinner de OneDrive permanentemente.
- `pnpm install` puede fallar por file locks intermitentes.
- Posible corrupción del store y resync entero del bundle del Mac Mini.

### Cómo hacerlo en macOS

**Opción A — Liberar espacio (recomendada, conserva enlace lógico):**

1. Finder → navega a `~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs/`.
2. Sobre cada una de estas carpetas, click derecho → **"Liberar espacio"** ("Free up space"):
   - `node_modules/`
   - `.next/`
   - `.pnpm-store/` (si existe)
3. La carpeta queda con icono de "nube" — sigue siendo visible pero deja de pesar localmente. Cuando hagas `pnpm install` o `pnpm dev`, OneDrive las re-descarga / regenera, lo cual es lento la primera vez pero después funciona normal.

**Opción B — Selective sync (alternativa, más invasiva):**

1. OneDrive menú → Settings → Account → "Choose folders".
2. Desmarca recursivamente las 3 carpetas.

> Nota: en macOS reciente, "Liberar espacio" tiene mejor UX que selective sync. Si tu OneDrive tiene la opción "Files On-Demand", está activada por defecto y "Liberar espacio" aprovecha esa infra.

**Verificación post-acción:**

```bash
du -sh "~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs/node_modules" 2>/dev/null
# Debería reportar tamaño ≈ 0 si "Liberar espacio" funcionó.
```

---

## 2. Generar `AUTH_SECRET` real en `.env.local` (alta prioridad antes de probar login)

Auth.js v5 funciona en dev con el placeholder `replace-with-openssl-rand-base64-32`, pero loguea warning y la sesión no es realmente segura. Para `pnpm dev` con login funcional:

```bash
cd "~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs"

# Genera AUTH_SECRET aleatorio
NEW_SECRET=$(openssl rand -base64 32)

# Reemplaza el placeholder en .env.local
sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=$NEW_SECRET|" .env.local
rm .env.local.bak

# Verifica
grep "^AUTH_SECRET=" .env.local
```

Hazlo tú mismo — yo no lo modifiqué porque el sistema de permisos bloquea agentes generando secretos sin autorización explícita (correcto, no es lo que quieres).

**El secret se queda local — NO se commitea** (el `.gitignore` excluye `.env.local`).

---

## 3. Push del repo (cuando estés listo)

El agente hizo **3 commits locales** que aún no están en GitHub:

```bash
cd "~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs"
git log --oneline
# 718af30 feat(auth): HU-02 Auth.js v5 + RBAC + login form (Sprint 1)
# 0b96ff8 feat(db): initial schema + AgroM seed
# 3b4bb41 chore: scaffold sprint 0 artifacts + local bootstrap
```

Push manual cuando estés listo:

```bash
git push -u origin main
```

El push lo bloqueé yo (acordamos no automatizar push directo a `main`). Cuando quieras que un nuevo push pase sin freno, autorízalo explícitamente al agente o añade la regla a tus settings.

---

## 4. Smoke test del login (cuando hayas hecho el 1 y el 2)

```bash
cd "~/Library/CloudStorage/OneDrive-Personal/02.SR docs/SRS - AGRO/AgroOPs"

# Asegura que la DB está arriba
docker compose ps     # ambos healthy
# Si no, levanta: make dev

# Carga env vars y arranca Next
set -a && source .env.local && set +a
pnpm dev
```

Abre `http://localhost:3000` → debería redirigir a `/login`.

Credenciales seed:
- `juancho@systemrapid.io` / `agroops-dev-2026` (rol `admin`)
- `john@agrom.es` / `agroops-dev-2026` (rol `piloto`)
- `adriana@agrom.es` / `agroops-dev-2026` (rol `operario`)

Tras login → redirige a `/dashboard` con tu nombre, email, rol y user ID. Botón "Cerrar sesión" vuelve a `/login`.

> **Nota visual:** sin Identity Sprint cerrado, el login y el dashboard se ven funcionalmente OK pero sin styling productivo. Eso es deliberado (CLAUDE.md regla: no declarar pantalla "lista" sin tokens DS).

> **Nota performance:** verás warning recurrente `linux/amd64 does not match linux/arm64/v8` por la imagen PostGIS — está corriendo bajo Rosetta/QEMU. No bloquea, sólo lento. Mitigación documentada en *Discrepancias del bundle Sprint 0* (#6).

---

## 5. Si te encuentras algo raro

- `pnpm tsc --noEmit` debería volver con exit 0.
- `pnpm test` debería pasar 29/29.
- Si Postgres tira `ECONNREFUSED`, levanta Docker Desktop y `make dev` antes de tocar nada.
- Si OneDrive sincronizó `node_modules` antes de que apliques el paso 1 y ves errores raros de pnpm, `rm -rf node_modules && pnpm install` después de aplicar "Liberar espacio".

---

## Historial

- **v0.1 (12 may 2026):** higiene tras Sprint 0 + HU-02. Acciones manuales que sólo tú puedes confirmar o que el sistema de permisos del agente bloquea (push, generar secrets, modificar OneDrive sync).
