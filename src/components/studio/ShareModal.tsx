import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Icon } from "../ui";
import "../../styles/reda-share.css";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  exhibitionTitle: string;
  slug: string;
}

export function ShareModal({
  isOpen,
  onClose,
  exhibitionTitle,
  slug,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/e/${encodeURIComponent(slug)}`
    : `/e/${slug}`;

  // Generate QR Code
  useEffect(() => {
    if (!isOpen || !slug) return;
    QRCode.toDataURL(publicUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: "#0E0D0A",
        light: "#FFFFFF",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Failed to generate QR code", err));
  }, [isOpen, slug, publicUrl]);

  // Keyboard navigation & dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${slug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleNativeShare = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: exhibitionTitle,
          text: `Explore "${exhibitionTitle}" on REDA Virtual Gallery`,
          url: publicUrl,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const encodedUrl = encodeURIComponent(publicUrl);
  const encodedTitle = encodeURIComponent(exhibitionTitle);
  const encodedShareText = encodeURIComponent(`Explore "${exhibitionTitle}" on REDA Virtual Gallery: `);

  const socialLinks = [
    {
      name: "Facebook",
      icon: "facebook" as const,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      label: "Share on Facebook",
    },
    {
      name: "X",
      icon: "x" as const,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      label: "Share on X",
    },
    {
      name: "LinkedIn",
      icon: "linkedin" as const,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      label: "Share on LinkedIn",
    },
    {
      name: "WhatsApp",
      icon: "whatsapp" as const,
      url: `https://api.whatsapp.com/send?text=${encodedShareText}${encodedUrl}`,
      label: "Share on WhatsApp",
    },
    {
      name: "Telegram",
      icon: "telegram" as const,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      label: "Share on Telegram",
    },
    {
      name: "Email",
      icon: "mail" as const,
      url: `mailto:?subject=${encodedTitle}&body=${encodedShareText}%0A${encodedUrl}`,
      label: "Share via Email",
    },
  ];

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className="reda-share-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="reda-share-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="reda-share-header">
          <div>
            <h2 id="share-modal-title" className="reda-share-title">
              Share Exhibition
            </h2>
            <p className="reda-share-subtitle">{exhibitionTitle}</p>
          </div>
          <button
            type="button"
            className="reda-share-close"
            onClick={onClose}
            aria-label="Close share dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="reda-share-qr-section">
          <div className="reda-share-qr-card">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR code for ${exhibitionTitle}`}
                className="reda-share-qr-img"
              />
            ) : (
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--reda-muted-ink)",
                }}
              >
                <Icon name="qrCode" size={32} />
              </div>
            )}
          </div>
          <button
            type="button"
            className="reda-share-qr-download"
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
          >
            <Icon name="download" size={13} />
            <span>Download QR Code (PNG)</span>
          </button>
        </div>

        <div className="reda-share-link-group">
          <label htmlFor="share-public-url" className="reda-share-link-label">
            Public Exhibition Link
          </label>
          <div className="reda-share-input-row">
            <input
              id="share-public-url"
              type="text"
              readOnly
              value={publicUrl}
              className="reda-share-input"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              type="button"
              className={`reda-share-copy-btn ${copied ? "reda-share-copy-btn--copied" : ""}`}
              onClick={handleCopy}
            >
              <Icon name={copied ? "check" : "copy"} size={14} />
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        <div className="reda-share-social-section">
          <div className="reda-share-social-grid">
            {socialLinks.map((item) => (
              <a
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="reda-share-social-item"
                aria-label={item.label}
              >
                <Icon name={item.icon} size={14} />
                <span>{item.name}</span>
              </a>
            ))}
          </div>

          {hasNativeShare && (
            <button
              type="button"
              className="reda-share-native-btn"
              onClick={handleNativeShare}
            >
              <Icon name="share" size={14} />
              <span>Share via Device…</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
