import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RuntimeRenderer from "../components/RuntimeRenderer";
import { FieldSchema } from "../types/schema";

const fields: FieldSchema[] = [
  { id: "full_name", type: "text", label: "Full Name", required: true },
  { id: "plan", type: "select", label: "Plan", required: true, options: ["basic", "pro"] },
  {
    id: "company",
    type: "text",
    label: "Company",
    required: true,
    conditional: { field: "plan", equals: "pro" },
  },
];

describe("RuntimeRenderer", () => {
  it("renders a labeled input for every field", () => {
    render(<RuntimeRenderer fields={fields} />);
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Plan/)).toBeInTheDocument();
  });

  it("hides a conditional field until its condition is met", () => {
    render(<RuntimeRenderer fields={fields} />);
    expect(screen.queryByLabelText(/Company/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Plan/), { target: { value: "pro" } });
    expect(screen.getByLabelText(/Company/)).toBeInTheDocument();
  });

  it("blocks submission and shows errors when required fields are empty", () => {
    const onSubmit = vi.fn();
    render(<RuntimeRenderer fields={fields} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText("Submit"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/'Full Name' is required/)).toBeInTheDocument();
  });

  it("calls onSubmit with form data once all required fields are valid", () => {
    const onSubmit = vi.fn();
    render(<RuntimeRenderer fields={fields} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Full Name/), { target: { value: "Monica" } });
    fireEvent.change(screen.getByLabelText(/Plan/), { target: { value: "basic" } });
    fireEvent.click(screen.getByText("Submit"));

    expect(onSubmit).toHaveBeenCalledWith({ full_name: "Monica", plan: "basic" });
  });

  it("shows an empty state when there are no fields", () => {
    render(<RuntimeRenderer fields={[]} />);
    expect(screen.getByText(/no fields yet/i)).toBeInTheDocument();
  });
});
