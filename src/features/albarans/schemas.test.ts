/**
 * AgroOps — albarans schemas tests (HU-15)
 */
import { describe, expect, it } from "vitest";
import { signAlbaranSchema, albaranCodeSchema, albaranIdSchema } from "./schemas";

const validPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX/AP8jvkk/AAAACklEQVQI12NgAAAAAgAB4iG8MwAAAABJRU5ErkJggg==";

const valid = {
  missionId: "00000000-0000-4000-8000-000000000001",
  signerFullName: "Juan Agricultor",
  signerNif: "12345678Z",
  signatureImageBase64: validPng,
};

describe("signAlbaranSchema", () => {
  it("acepta input válido", () => {
    expect(signAlbaranSchema.safeParse(valid).success).toBe(true);
  });

  it("normaliza NIF (uppercase + sin guiones/puntos)", () => {
    const r = signAlbaranSchema.safeParse({
      ...valid,
      signerNif: "12.345.678-z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.signerNif).toBe("12345678Z");
  });

  it("trim del nombre", () => {
    const r = signAlbaranSchema.safeParse({
      ...valid,
      signerFullName: "  Juan  ",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.signerFullName).toBe("Juan");
  });

  it("rechaza missionId no UUID", () => {
    expect(
      signAlbaranSchema.safeParse({ ...valid, missionId: "x" }).success,
    ).toBe(false);
  });

  it("rechaza signerFullName vacío", () => {
    expect(
      signAlbaranSchema.safeParse({ ...valid, signerFullName: "" }).success,
    ).toBe(false);
  });

  it("rechaza signatureImageBase64 vacío", () => {
    expect(
      signAlbaranSchema.safeParse({
        ...valid,
        signatureImageBase64: "",
      }).success,
    ).toBe(false);
  });

  it("rechaza signatureImageBase64 que no es data URL PNG", () => {
    expect(
      signAlbaranSchema.safeParse({
        ...valid,
        signatureImageBase64: "data:image/jpeg;base64,abc",
      }).success,
    ).toBe(false);

    expect(
      signAlbaranSchema.safeParse({
        ...valid,
        signatureImageBase64: "not-a-data-url",
      }).success,
    ).toBe(false);
  });
});

describe("albaranIdSchema / albaranCodeSchema", () => {
  it("acepta UUID válido", () => {
    expect(
      albaranIdSchema.safeParse("00000000-0000-4000-8000-000000000000")
        .success,
    ).toBe(true);
  });

  it("rechaza no-UUID", () => {
    expect(albaranIdSchema.safeParse("x").success).toBe(false);
  });

  it("acepta código ALB-YYYY-NNNN", () => {
    expect(albaranCodeSchema.safeParse("ALB-2026-0001").success).toBe(true);
  });

  it("rechaza formato distinto", () => {
    expect(albaranCodeSchema.safeParse("ALB-26-1").success).toBe(false);
    expect(albaranCodeSchema.safeParse("AGM-2026-0001").success).toBe(false);
  });
});
