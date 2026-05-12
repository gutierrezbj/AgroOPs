# DESIGN.md — Design System AgroOps

**Estado:** placeholder estructurado. **Bloqueado hasta Identity Sprint AgroOps cerrado.**

---

## Jerarquía SRS Design System

Todo producto SRS se compone en tres capas (en este orden):

1. **Foundation** — primitivos compartidos por todos los productos SRS (espaciado base, escala tipográfica, breakpoints, radii, sombras).
2. **Vertical Theme — Agro** — tokens específicos del vertical agrario (paleta tierra/verde, iconografía agro, motion vegetal).
3. **Product-Specific — AgroOps** — overrides exclusivos de AgroOps (acentos de marca, ilustraciones, ilustraciones de albarán/firma).

**Regla no negociable:** no se usan defaults de Tailwind ni Shadcn sin pasar por este sistema. Si una pantalla parece genérica, falla la Distinctiveness Audit y bloquea deploy.

---

## Foundation (heredado SRS)

Estos tokens vienen del Foundation SRS y son inmutables aquí.

```css
/* Espaciado base: 4px */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;

/* Radii */
--radius-sm: 0.25rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;

/* Breakpoints */
--bp-sm: 640px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

---

## Vertical Theme — Agro

**🔴 Pendiente de Identity Sprint.** Placeholders:

```css
/* Paleta — pendiente Identity Sprint */
--agro-earth-50:  /* TBD */;
--agro-earth-500: /* TBD */;
--agro-earth-900: /* TBD */;

--agro-leaf-50:   /* TBD */;
--agro-leaf-500:  /* TBD */;
--agro-leaf-900:  /* TBD */;

--agro-sky-50:    /* TBD */;
--agro-sky-500:   /* TBD */;
--agro-sky-900:   /* TBD */;

/* Tipografía — pendiente Identity Sprint */
--font-display:   /* TBD */;
--font-body:      /* TBD */;
--font-mono:      /* TBD */;
```

---

## Product-Specific — AgroOps

**🔴 Pendiente de Identity Sprint.** Cuando se cierre, definir aquí:

- Logo y variantes (claro/oscuro, isotipo, lockup horizontal/vertical).
- Acentos de marca (color de acción primaria, color de alerta crítica meteo/NOTAM).
- Iconografía propietaria (drone aplicador, albarán firmado, parcela SIGPAC).
- Ilustraciones para estados vacíos.
- Patrón de PDF dossier (albarán + presupuesto).

---

## Componentes base (mapping a Tailwind/Shadcn)

Cuando se cree un componente nuevo, **siempre** aplicar tokens del Vertical Theme + Product-Specific. **Nunca** dejar el default Shadcn.

| Componente Shadcn | Override AgroOps                                  |
| ----------------- | ------------------------------------------------- |
| Button (primary)  | Color de acción Agro · radius `--radius-md`       |
| Input             | Border earth-500 · focus ring leaf-500            |
| Card              | Sombra Foundation · borde earth-100               |
| Toast             | Variantes éxito (leaf) / alerta (sky) / error     |
| Map container     | MapLibre con tiles CARTO + overlay SIGPAC custom  |

---

## Distinctiveness Audit (12 puntos)

Antes de cualquier deploy, ninguna pantalla puede pasar si responde "sí" a alguno de estos:

1. ¿Se ve como una Shadcn demo cualquiera?
2. ¿Hay colores Tailwind por defecto (gray-500, blue-500, etc.) sin override?
3. ¿Falta iconografía agro propietaria en pantalla principal?
4. ¿La tipografía es la default del sistema?
5. ¿El mapa tiene tiles default sin estilo CARTO+Agro?
6. ¿Los botones primarios usan el default de Shadcn?
7. ¿Los estados vacíos son texto plano sin ilustración?
8. ¿Los PDFs generados (albarán, presupuesto) parecen Word?
9. ¿La marca AgroOps no aparece visible en algún componente importante?
10. ¿Falta micro-copy en español (jerga agraria)?
11. ¿Las tablas son `<table>` sin estilo Agro?
12. ¿La pantalla podría ser de cualquier otro producto SRS sin cambios?

---

## Identity Sprint — Checklist

Cuando se ejecute el Identity Sprint (sesión aparte), salir con:

- [ ] Logo principal + 3 variantes
- [ ] Paleta Earth (10 stops) + Leaf (10 stops) + Sky (10 stops)
- [ ] Tipografía display + body + mono (3 weights cada una)
- [ ] Set iconográfico v1 (mín. 20 iconos agro propietarios)
- [ ] 5 ilustraciones para estados vacíos
- [ ] Template PDF albarán y presupuesto
- [ ] `DESIGN.md` actualizado con tokens reales (no TBD)
- [ ] Tailwind config con tokens importados
- [ ] Distinctiveness Audit ejecutada sobre primera pantalla real

Hasta entonces: **no hay UI productiva firmada.**
