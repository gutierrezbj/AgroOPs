# Identity Sprint AgroOps — inputs (draft 12 may 2026)

Documento de trabajo para los 6 pasos del Identity Sprint del SRS Design System. Los pasos 1–3 los puedo proponer como draft a partir del SDD-01/02/04 y CLAUDE.md. Los pasos 4–5 los rellenas tú (decisiones de gusto). El paso 6 requiere un externo.

> **Por qué importa:** mientras este Identity Sprint no esté cerrado, el `DESIGN.md` del repo y la Checklist UX/UI bloquean declarar cualquier pantalla "lista". HU-02 (login + dashboard) ya está commiteada como funcional sin styling productivo; HU-03 (layout productivo) la levantamos después del Identity Sprint.

---

## Paso 1 — Esencia del producto en una frase

**Draft propuesto:**

> **AgroOps es el cuaderno de bitácora del operador de aplicación fitosanitaria con dron**, que cierra el ciclo orden → vuelo → albarán firmado → factura → registro PAC en una interfaz única, con auditoría completa y operación bajo paraguas Drovinci NPTA.

Variantes a considerar:

1. *"El sistema operativo de la operación dron AgroM"* — corto, interno, no comunica al mercado.
2. *"AgroOps cierra el ciclo de una aplicación fitosanitaria con dron: del WhatsApp al cuaderno PAC."* — más narrativo, contrasta con el statu quo.
3. *"Una sola pantalla entre la cabina del dron y la administración pública."* — visual, evoca el rol del operador como bisagra.

**Decisión TBD:** ¿cuál encaja mejor con cómo te imaginas explicándolo en 10 segundos a un asegurador o cooperativa?

---

## Paso 2 — Tres adjetivos no genéricos

**Draft propuesto:**

- **Forense** — cada operación queda con audit log inmutable, hash del PDF, firma del cliente, snapshot meteo. No es "trazable" (genérico): es **forense**, válido en peritaje de siniestros agroseguro.
- **Compacto** — single-tenant per deployment, sin gestión de tenants en UI, sin scope creep. Una pantalla por épica, una decisión por click. No es "minimalista" (genérico): es **compacto** en el sentido de denso por unidad de superficie.
- **Aerolegal** — operación bajo NPTA Drovinci, NOTAMs ENAIRE en preflight, EASA class del dron en cada misión, ROPO+AESA del piloto. No es "regulado" (genérico): es **aerolegal**, lenguaje del operador AESA.

Adjetivos a evitar (Blacklist genérica del Design System):
- ❌ Moderno, intuitivo, profesional, fácil, potente, ágil, innovador, robusto, simple, eficiente, completo, integrado, smart.

**Decisión TBD:** ¿forense / compacto / aerolegal te resuenan? ¿alguno sustituirías?

---

## Paso 3 — Referencias visuales (3 sí + 3 no)

**Draft de "sí" (sugerencias para investigación):**

1. **Cartas náuticas IGN / Almirantazgo británico** — Densidad de información geoespacial, simbología propia (no Material/Tailwind), serif para títulos, líneas finas, colores apagados. Encaja con "aerolegal" + "forense".
2. **NTSB aviation incident reports** — Estructura tabular densa, monospace para datos técnicos, palette earth tones, sin gradientes. Encaja con "forense" y con la naturaleza de cuaderno de bitácora.
3. **Bloomberg Terminal (vibe, no UI literal)** — Densidad máxima por pantalla, keyboard-first, paletas saturadas pero limitadas a 4–5 colores, tipografía monoespaciada para datos numéricos críticos. Encaja con "compacto".

**Draft de "no" (Blacklist específica AgroOps):**

1. **Cualquier SaaS B2B genérico con header gris claro + sidebar morado + cards con shadow + Inter** — defaults Shadcn / Vercel / Linear clones. Identidad cero.
2. **Apps agroindustriales que parecen software del Ministerio 2008** — verdes-amarillos saturados, iconos de hojita o tractor, gradientes radial. AgroOps **no es** agro-tradicional.
3. **Mapas Google Maps default + pines rojos** — Si MapLibre se ve como Google Maps, perdimos. El mapa de AgroOps es una capa técnica (parcelas SIGPAC + NOTAMs + viento + telemetría), no un mapa de turismo.

**Decisión TBD:** validar 3 referencias "sí" buscando capturas. Quizás añadir una propia: cuaderno de campo agrario español pre-digital (apuntes a mano con tablas de productos, dosis, fechas, parcelas).

---

## Paso 4 — Decisión de paleta (NO defaults)

> Rellenar tú con tres-cinco colores específicos. NO arrancar de Tailwind defaults ni de Shadcn slate/zinc/stone.

**Inputs para pensarlo:**

- AgroOps **no es verde-bosque** (cliché agro). Tampoco es azul corporativo (cliché SaaS).
- Considerar: tonos tierra (ocres, mostazas, rojos óxido) + un acento aerolegal (azul ENAIRE o naranja chaleco AESA) + un neutral cálido para fondo.
- Acción del usuario: 1 color de "peligro" (cancelación de misión, override de gate de preflight), 1 color de "OK" (misión completada, factura emitida), 1 color de "espera" (preflight, in_flight).
- Modo claro y modo oscuro. La cabina de campo es luz fuerte → modo claro AAA. La pantalla del operario en oficina → cualquier modo.

**Slots a rellenar (template):**
- `primary` — _________
- `surface` — _________
- `surface-elevated` — _________
- `text-strong` — _________
- `text-soft` — _________
- `accent-action` — _________
- `accent-warn` — _________
- `accent-danger` — _________
- `accent-ok` — _________

**Decisión TBD:** tú decides. Te puedo proponer 3 paletas concretas si quieres después del Template Test.

---

## Paso 5 — Decisión de tipografía (NO Inter por defecto)

> Rellenar tú. Inter está prohibida por el Design System SRS.

**Inputs para pensarlo:**

- AgroOps tiene **mucho dato técnico** en pantalla: códigos `AGM-2026-0001`, `ALB-2026-0001`, IBANs, NIF/CIF, lotes alfanuméricos, coordenadas SIGPAC, áreas con 4 decimales. → necesita **monoespaciada para datos**.
- Texto narrativo (descripciones, mensajes, mensajes de error) → una sans-serif con personalidad, NO Inter / SF Pro / Roboto.
- Encabezados → considerar serif técnica o slab para personalidad (no Playfair, no Lora — son cliché editorial).

**Slots a rellenar (template):**
- Display / H1 — _________
- Heading / H2-H3 — _________
- Body — _________
- Mono / código / datos técnicos — _________

**Sugerencias seguras (ninguna es default ni cliché):**
- Sans con carácter: **Söhne** (paid), **Manrope** (libre, geometric), **Sentinel** (paid, serif técnico).
- Mono con carácter: **JetBrains Mono** (libre, técnica), **IBM Plex Mono** (libre, oficial-vintage), **Berkeley Mono** (paid, fintech).

**Decisión TBD:** tú decides. Probar 2-3 combinaciones en una pantalla de "Lista de misiones" antes de fijar.

---

## Paso 6 — Template Test con alguien externo

**Mecánica:**

1. Generar 1 pantalla key de AgroOps (sugerencia: vista "Lista de misiones" con 8 filas, codes `AGM-2026-NNNN`, fechas, estados, clientes) renderizada con las decisiones de pasos 4–5.
2. Generar 1 pantalla equivalente en una herramienta genérica (Linear, Vercel admin, cualquier dashboard SaaS reciente).
3. Imprimir ambas o mostrarlas a alguien que **no esté en SRS / AgroM** (un familiar, un amigo no técnico). Tapar los logos.
4. Preguntar: *"¿Estas son la misma app?"* y *"¿Cuál te parece más seria / profesional?"* — sin dar contexto.
5. Si la respuesta es *"sí, son la misma"* → fallaste el test, vuelve a pasos 1–5.
6. Si la respuesta es *"no, esta es distinta"* y la persona puede señalar **2–3 razones específicas** sin que tú la guíes → pasaste.

**Candidatos a Template Test:**
- Adriana (titular fiscal AgroM, no técnica, perfil objetivo) — además es operario potencial, doble valor.
- Algún piloto de Drovinci que no haya visto el proyecto.
- Marcos Álvarez (abogado, perfil profesional adulto, distinta industria).

---

## Próximo paso operativo

1. Tú repasas los pasos 1-3 (drafts) y me dices qué ajustarías.
2. Bloquea 2-4 horas en agenda para los pasos 4-5 (decisiones de paleta/tipografía).
3. Programa Template Test con candidato (paso 6).
4. Una vez cerrado el Identity Sprint, levanto HU-03 (layout productivo) con tokens reales en el repo y desbloqueamos la cadena UX/UI.

**Mientras tanto, sigue verde para trabajar:** HU-04, HU-05, HU-06, HU-07, HU-08 (ABMs de fleet/parcels/phytosanitary/clients) tienen lógica de negocio + schema + Server Actions que se pueden adelantar sin diseño final. La pantalla "lista" se declara cuando llegue el Identity Sprint.

---

## Historial

- **v0.1 (12 may 2026):** drafts de pasos 1-3 escritos a partir del SDD-01 + CLAUDE.md + 5 lecciones acumuladas. Pasos 4-6 quedan pendientes de decisión humana.
