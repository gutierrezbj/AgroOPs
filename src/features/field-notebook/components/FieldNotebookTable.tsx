/**
 * AgroOps — FieldNotebookTable (HU-21)
 *
 * Tabla del cuaderno de campo. Una fila por aplicación-de-producto-en-parcela.
 * Server component (sin estado) — los filtros se aplican vía query params en la URL.
 *
 * En v1.0 listamos todas las columnas exigidas por PAC en horizontal. En v1.1
 * evaluaremos agrupado por fecha + parcela con resumen colapsable.
 */
import { formatDose, formatTotalAmount, type FieldNotebookEntry } from "../services";

interface FieldNotebookTableProps {
  entries: FieldNotebookEntry[];
}

export function FieldNotebookTable({ entries }: FieldNotebookTableProps) {
  if (entries.length === 0) {
    return (
      <p className="field-notebook__empty">
        Sin aplicaciones registradas en este rango de fechas. Sólo se muestran
        misiones en estado <code>completed</code> o <code>invoiced</code>.
      </p>
    );
  }

  return (
    <div className="field-notebook__scroll">
      <table className="field-notebook__table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Misión</th>
            <th scope="col">Cliente</th>
            <th scope="col">Parcela SIGPAC</th>
            <th scope="col">Cultivo</th>
            <th scope="col" className="num">
              Área tratada
            </th>
            <th scope="col">Producto</th>
            <th scope="col">Materia activa</th>
            <th scope="col">Lote</th>
            <th scope="col">Reg. MAPA</th>
            <th scope="col" className="num">
              Dosis aplicada
            </th>
            <th scope="col" className="num">
              Volumen total
            </th>
            <th scope="col">Operador (ROPO)</th>
            <th scope="col">Equipo</th>
            <th scope="col">Albarán</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={`${e.missionId}-${e.parcelId}-${e.lotUsed}-${e.productCommercialName}`}>
              <td className="mono">
                {new Date(e.appliedAt).toLocaleDateString("es-ES")}
              </td>
              <td className="mono">{e.missionCode}</td>
              <td>
                {e.clientName}
                <br />
                <small className="mono">{e.clientTaxId}</small>
              </td>
              <td>
                {e.parcelName}
                <br />
                <small className="mono">{e.sigpacReference}</small>
              </td>
              <td>
                {e.crop ?? "—"}
                {e.cropVariety && (
                  <>
                    <br />
                    <small>{e.cropVariety}</small>
                  </>
                )}
              </td>
              <td className="num mono">{e.areaTreatedHa.toFixed(4)} ha</td>
              <td>
                {e.productCommercialName}
                {e.productFormulation && (
                  <>
                    <br />
                    <small>{e.productFormulation}</small>
                  </>
                )}
              </td>
              <td>{e.productActiveIngredient}</td>
              <td className="mono">{e.lotUsed}</td>
              <td className="mono">{e.productMapaRegistration ?? "—"}</td>
              <td className="num mono">
                {formatDose(e.appliedDoseValue, e.appliedDoseUnit)}
              </td>
              <td className="num mono">
                {formatTotalAmount(e.totalAmountUsed, e.totalAmountUnit)}
              </td>
              <td>
                {e.pilotName ?? "—"}
                {e.pilotRopoNumber && (
                  <>
                    <br />
                    <small className="mono">ROPO {e.pilotRopoNumber}</small>
                  </>
                )}
                {e.pilotAesaLicense && (
                  <>
                    <br />
                    <small className="mono">AESA {e.pilotAesaLicense}</small>
                  </>
                )}
              </td>
              <td>
                {e.droneModel ?? "—"}
                {e.droneSerialNumber && (
                  <>
                    <br />
                    <small className="mono">SN {e.droneSerialNumber}</small>
                  </>
                )}
                {e.droneRegistrationCode && (
                  <>
                    <br />
                    <small className="mono">{e.droneRegistrationCode}</small>
                  </>
                )}
              </td>
              <td>
                {e.albaranCode ? (
                  <a
                    href={`/api/albarans/${e.albaranCode}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="mono">{e.albaranCode}</span>
                  </a>
                ) : (
                  "—"
                )}
                {e.albaranSignedAt && (
                  <>
                    <br />
                    <small>
                      Firmado{" "}
                      {new Date(e.albaranSignedAt).toLocaleDateString("es-ES")}
                    </small>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
