import { describe, it, expect } from "vitest";
import { validateSubmission } from "../utils/validation";
import { FieldSchema } from "../types/schema";

const nameField: FieldSchema = { id: "name", type: "text", label: "Name", required: true };
const ageField: FieldSchema = { id: "age", type: "number", label: "Age", required: true };
const planField: FieldSchema = {
  id: "plan",
  type: "select",
  label: "Plan",
  required: true,
  options: ["basic", "pro"],
};
const companyField: FieldSchema = {
  id: "company",
  type: "text",
  label: "Company",
  required: true,
  conditional: { field: "plan", equals: "pro" },
};

describe("validateSubmission", () => {
  it("passes a fully valid submission", () => {
    const result = validateSubmission([nameField, ageField], { name: "Monica", age: 34 });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("flags a missing required field", () => {
    const result = validateSubmission([nameField], { name: "" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe("name");
  });

  it("flags a non-numeric value for a number field", () => {
    const result = validateSubmission([ageField], { age: "not-a-number" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/number/);
  });

  it("rejects a select value outside the allowed options", () => {
    const result = validateSubmission([planField], { plan: "enterprise" });
    expect(result.valid).toBe(false);
  });

  it("requires a conditional field only when its condition is met", () => {
    const proResult = validateSubmission([planField, companyField], { plan: "pro", company: "" });
    expect(proResult.valid).toBe(false);

    const basicResult = validateSubmission([planField, companyField], {
      plan: "basic",
      company: "",
    });
    expect(basicResult.valid).toBe(true);
  });
});
