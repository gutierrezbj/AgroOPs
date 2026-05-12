# SETUP.md — Cómo aplicar este paquete al repo AgroOPs

Este paquete contiene los artefactos obligatorios SRS y el bootstrap Mac local para AgroOps.
Cópialo al repo recién clonado y haz un commit limpio. Sprint 0 desbloqueado.

---

## Pasos

```bash
# 1. Clonar el repo si aún no lo tienes
git clone https://github.com/gutierrezbj/AgroOPs.git
cd AgroOPs

# 2. Copiar todos los archivos de este bundle al root del repo
#    (desde la carpeta donde está este bundle)
cp -R /Users/juanguti/Library/CloudStorage/OneDrive-Personal/02.SR\ docs/SRS\ -\ AGRO/agroops-bootstrap/. ./

# 3. Verificar que están todos
ls -la
ls -la tasks/
ls -la scripts/db-init/

# 4. Hacer el script ejecutable
chmod +x scripts/bootstrap.sh

# 5. Primer commit
git add .
git commit -m "chore: scaffold sprint 0 artifacts + local bootstrap

- Add DESIGN.md, CLAUDE.md, tasks/todo.md, tasks/lessons.md
- Add .env.example with all integrations
- Add docker-compose.yml (Postgres 16 + PostGIS 3.4, Redis 7)
- Add Dockerfile (multi-stage production build)
- Add Makefile with common dev commands
- Add scripts/bootstrap.sh and db-init extensions
- Add drizzle.config.ts and .gitignore

Refs: SDD-01..SDD-08 (closed 11 may 2026)"
git push origin main
```

---

## Estructura final esperada en el repo

```
AgroOPs/
├── .env.example
├── .gitignore
├── CLAUDE.md
├── DESIGN.md
├── Dockerfile
├── Makefile
├── README.md
├── SETUP.md                 ← este archivo (puedes borrarlo tras aplicar)
├── docker-compose.yml
├── drizzle.config.ts
├── scripts/
│   ├── bootstrap.sh
│   └── db-init/
│       └── 01-extensions.sql
└── tasks/
    ├── lessons.md
    └── todo.md
```

---

## Próximos pasos tras el commit

1. **Confirmar subdominio:** `agroops.agrom.es` (apuntar DNS cuando esté el servidor).
2. **Scaffold Next.js 16:** desde el root del repo:
   ```bash
   pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
   ```
   (te pedirá confirmación porque hay archivos. Acepta sobrescribir solo lo de Next, no los .md).
3. **Instalar Drizzle + Auth.js v5 + Zod + pdf-lib + maplibre-gl** según el stack del CLAUDE.md.
4. **Primera migración** vacía para que Drizzle genere la carpeta `migrations/`.
5. **Identity Sprint** (sesión aparte) antes de tocar UI productiva.
6. **Provisionar servidor de producción** y configurar Caddy + DNS.

---

*Este SETUP.md se puede borrar después del primer commit. Es solo guía de uso.*
