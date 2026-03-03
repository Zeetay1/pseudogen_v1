import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InputForm from "./InputForm";

describe("InputForm", () => {
  const mockOnResult = vi.fn();

  beforeEach(() => {
    mockOnResult.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders form with problem textarea and Generate button", () => {
    render(<InputForm onResult={mockOnResult} />);
    expect(screen.getByPlaceholderText(/Describe the problem or algorithm/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate/i })).toBeInTheDocument();
  });

  it("disables Generate button and shows Generating when loading", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ markdown: "BEGIN\nEND" })),
    });
    render(<InputForm onResult={mockOnResult} />);
    const input = screen.getByPlaceholderText(/Describe the problem or algorithm/);
    fireEvent.change(input, { target: { value: "Sort a list" } });
    const btn = screen.getByRole("button", { name: /Generate/i });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /Generating/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(mockOnResult).toHaveBeenCalled();
    });
  });

  it("calls onResult with markdown when request succeeds", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ markdown: "BEGIN\n  SORT list\nEND" })),
    });
    render(<InputForm onResult={mockOnResult} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the problem or algorithm/), {
      target: { value: "Sort a list" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate/i }));
    await waitFor(() => {
      expect(mockOnResult).toHaveBeenCalledWith(
        expect.objectContaining({
          problem: "Sort a list",
          markdown: "BEGIN\n  SORT list\nEND",
        })
      );
    });
  });

  it("shows in-UI error when request fails", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ detail: "Server error" })),
    });
    render(<InputForm onResult={mockOnResult} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the problem or algorithm/), {
      target: { value: "Sort" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate/i }));
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).toBe("Server error");
    });
  });
});
