import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Pseudogen header and history toggle", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /Pseudogen/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/i })).toBeInTheDocument();
  });

  it("shows History panel with empty state when no history", () => {
    render(<App />);
    expect(screen.getByText(/No history yet/i)).toBeInTheDocument();
  });
});
