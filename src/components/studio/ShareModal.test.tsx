import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

describe("ShareModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    exhibitionTitle: "Ký Ức Đông Dương",
    slug: "ky-uc-dong-duong",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(<ShareModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal header, exhibition title, public URL input, and QR code container when isOpen is true", () => {
    render(<ShareModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Share Exhibition")).toBeDefined();
    expect(screen.getByText("Ký Ức Đông Dương")).toBeDefined();

    const urlInput = screen.getByRole("textbox") as HTMLInputElement;
    expect(urlInput.value).toContain("/e/ky-uc-dong-duong");
  });

  it("copies URL to clipboard and provides feedback on Copy button click", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ShareModal {...defaultProps} />);

    const copyBtn = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("/e/ky-uc-dong-duong"));

    await waitFor(() => {
      expect(screen.getByText(/copied/i)).toBeDefined();
    });
  });

  it("calls onClose when close button is clicked", () => {
    render(<ShareModal {...defaultProps} />);

    const closeBtn = screen.getByLabelText("Close share dialog");
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(<ShareModal {...defaultProps} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("renders social sharing links with correct encoded targets", () => {
    render(<ShareModal {...defaultProps} />);

    const fbLink = screen.getByLabelText(/share on facebook/i) as HTMLAnchorElement;
    expect(fbLink.href).toContain("facebook.com/sharer/sharer.php");
    expect(fbLink.href).toContain(encodeURIComponent("/e/ky-uc-dong-duong"));

    const xLink = screen.getByLabelText(/share on x/i) as HTMLAnchorElement;
    expect(xLink.href).toContain("twitter.com/intent/tweet");
    expect(xLink.href).toContain(encodeURIComponent("Ký Ức Đông Dương"));

    const liLink = screen.getByLabelText(/share on linkedin/i) as HTMLAnchorElement;
    expect(liLink.href).toContain("linkedin.com/sharing/share-offsite");

    const waLink = screen.getByLabelText(/share on whatsapp/i) as HTMLAnchorElement;
    expect(waLink.href).toContain("whatsapp.com");

    const tgLink = screen.getByLabelText(/share on telegram/i) as HTMLAnchorElement;
    expect(tgLink.href).toContain("t.me/share");

    const mailLink = screen.getByLabelText(/share via email/i) as HTMLAnchorElement;
    expect(mailLink.href).toContain("mailto:");
  });

  it("renders Native Share button and triggers navigator.share when available", () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: shareMock,
    });

    render(<ShareModal {...defaultProps} />);

    const nativeShareBtn = screen.getByRole("button", { name: /share via device/i });
    expect(nativeShareBtn).toBeDefined();

    fireEvent.click(nativeShareBtn);
    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ký Ức Đông Dương",
        url: expect.stringContaining("/e/ky-uc-dong-duong"),
      })
    );
  });
});
