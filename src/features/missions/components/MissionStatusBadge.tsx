/**
 * AgroOps — MissionStatusBadge
 */
import type { MissionStatus } from "@/db/schema/missions";
import { MISSION_STATUS_LABELS } from "../state-machine";

const SEVERITY_CLASS: Record<MissionStatus, string> = {
  draft: "drone-status drone-status--maintenance",
  planned: "drone-status drone-status--maintenance",
  approved: "drone-status drone-status--active",
  preflight: "drone-status drone-status--active",
  in_flight: "drone-status drone-status--active",
  completed: "drone-status drone-status--active",
  invoiced: "drone-status drone-status--active",
  cancelled: "drone-status drone-status--retired",
};

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return (
    <span className={SEVERITY_CLASS[status]} data-status={status}>
      {MISSION_STATUS_LABELS[status]}
    </span>
  );
}
