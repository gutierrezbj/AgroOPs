/**
 * AgroOps — DashboardFooter (Sprint 5 Distinctiveness Audit)
 *
 * Footer sutil con tagline AgroOps + paraguas Drovinci + version build.
 * Texto muted, no compite con el contenido. Versión leída de
 * `AGROOPS_VERSION` o `VERCEL_GIT_COMMIT_SHA` (los 7 primeros) o "dev".
 */
const VERSION =
  process.env.AGROOPS_VERSION ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  "dev";

export function DashboardFooter() {
  return (
    <footer className="dashboard-footer" role="contentinfo">
      <div className="dashboard-footer__inner">
        <span className="dashboard-footer__tagline">
          AgroOps · Sistema de operaciones UAS para aplicación fitosanitaria
        </span>
        <span className="dashboard-footer__separator" aria-hidden="true">
          ·
        </span>
        <span className="dashboard-footer__npta">
          Operación bajo paraguas Drovinci NPTA
        </span>
        <span className="dashboard-footer__separator" aria-hidden="true">
          ·
        </span>
        <span className="dashboard-footer__version mono">build {VERSION}</span>
      </div>
    </footer>
  );
}
