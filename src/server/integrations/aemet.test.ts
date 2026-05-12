/**
 * AgroOps — AEMET tests (HU-13)
 *
 * Tests puros de `evaluateFlightSuitable` (sin DB ni fetch) y verificación
 * del stub fallback (sin AEMET_API_KEY el snapshot tiene `raw.stub: true`).
 */
import { describe, expect, it } from "vitest";
import {
  FLIGHT_THRESHOLDS,
  captureWeatherForCoordinates,
  evaluateFlightSuitable,
} from "./aemet";

describe("evaluateFlightSuitable", () => {
  it("acepta condiciones óptimas (viento bajo, sin lluvia, 20°C, 55% HR)", () => {
    expect(
      evaluateFlightSuitable({
        windSpeedMs: 3,
        precipitationMm: 0,
        temperatureC: 20,
        humidityPct: 55,
      }),
    ).toBe(true);
  });

  it("acepta cuando algún campo no está presente (no penaliza)", () => {
    expect(
      evaluateFlightSuitable({
        windSpeedMs: 3,
      }),
    ).toBe(true);
    expect(evaluateFlightSuitable({})).toBe(true);
  });

  it("rechaza si viento > 10 m/s", () => {
    expect(
      evaluateFlightSuitable({
        windSpeedMs: FLIGHT_THRESHOLDS.maxWindSpeedMs + 0.1,
      }),
    ).toBe(false);
  });

  it("rechaza si precipitación > 0.5 mm/h", () => {
    expect(
      evaluateFlightSuitable({
        precipitationMm: FLIGHT_THRESHOLDS.maxPrecipitationMm + 0.1,
      }),
    ).toBe(false);
  });

  it("rechaza si temperatura < 5°C", () => {
    expect(
      evaluateFlightSuitable({
        temperatureC: FLIGHT_THRESHOLDS.minTemperatureC - 1,
      }),
    ).toBe(false);
  });

  it("rechaza si temperatura > 35°C", () => {
    expect(
      evaluateFlightSuitable({
        temperatureC: FLIGHT_THRESHOLDS.maxTemperatureC + 1,
      }),
    ).toBe(false);
  });

  it("rechaza si humedad > 95%", () => {
    expect(
      evaluateFlightSuitable({
        humidityPct: FLIGHT_THRESHOLDS.maxHumidityPct + 1,
      }),
    ).toBe(false);
  });

  it("acepta en el umbral exacto (viento = 10 m/s)", () => {
    expect(
      evaluateFlightSuitable({
        windSpeedMs: FLIGHT_THRESHOLDS.maxWindSpeedMs,
      }),
    ).toBe(true);
  });
});

describe("captureWeatherForCoordinates — stub mode", () => {
  it("devuelve snapshot con flightSuitable=true en condiciones por defecto", async () => {
    // En el entorno de test no hay AEMET_API_KEY → cae al stub.
    const snapshot = await captureWeatherForCoordinates(40.41, -3.7);
    expect(snapshot.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snapshot.stationId).toContain("stub");
    expect(snapshot.flightSuitable).toBe(true);
    expect(snapshot.raw).toMatchObject({ stub: true });
  });

  it("stub mantiene valores razonables", async () => {
    const s = await captureWeatherForCoordinates(40.41, -3.7);
    expect(s.windSpeedMs).toBeGreaterThan(0);
    expect(s.windSpeedMs).toBeLessThan(FLIGHT_THRESHOLDS.maxWindSpeedMs);
    expect(s.temperatureC).toBeGreaterThanOrEqual(
      FLIGHT_THRESHOLDS.minTemperatureC,
    );
    expect(s.temperatureC).toBeLessThanOrEqual(
      FLIGHT_THRESHOLDS.maxTemperatureC,
    );
  });

  it("stub incluye las coordenadas pedidas en raw para inspección", async () => {
    const s = await captureWeatherForCoordinates(41.5, 2.1);
    expect(s.raw).toMatchObject({ lat: 41.5, lng: 2.1 });
  });
});
