import { useState } from 'react';
import type { Artist } from '../../../types/schema';
import { getImageUrl } from '../../../lib/media/gdrive';
import { Icon } from '../../ui';

interface ArtistViewerPreviewProps {
  artist: Artist | null;
  isNew?: boolean;
}

type PreviewDevice = 'pc' | 'mobile_landscape';

// All size/spacing differences between PC and Mobile Landscape in one place.
// Rendering logic is shared; only these values differ.
type DeviceConfig = {
  containerWidth: string;
  containerMaxHeight: string;
  backdropPadding: string;
  colWidth: string;
  portraitSize: number;
  portraitBorder: string;
  iconSize: number;
  colPadding: string;
  colGap: string;
  closeIconSize: number;
  closeStyle: React.CSSProperties;
  infoPadding: string;
  kickerFontSize: string;
  kickerLetterSpacing: string;
  titleFontSize: string;
  titleMargin: string;
  quoteBorderLeft: string;
  quotePadding: string;
  quoteMarginBottom: string;
  quoteMarkSize: string;
  quoteMarkSpacing: string;
  quoteFontSize: string;
  bioFontSize: string;
  bioLineHeight: number;
  bioParaMargin: string;
  bioEmptyFontSize: string;
  lifedateFontSize: string;
  lifedateLetterSpacing: string;
  lifedatePadding: string;
  contactGap: string;
  contactFontSize: string;
  contactIconSize: number;
  containerBoxShadow: string;
};

const DEVICE_CONFIG: Record<PreviewDevice, DeviceConfig> = {
  pc: {
    containerWidth: 'min(860px, 92%)',
    containerMaxHeight: 'min(620px, calc(100% - 48px))',
    backdropPadding: '64px 24px 24px',
    colWidth: '280px',
    portraitSize: 130,
    portraitBorder: '2px solid var(--reda-gold)',
    iconSize: 52,
    colPadding: '0',
    colGap: '16px',
    closeIconSize: 16,
    closeStyle: { pointerEvents: 'none' },
    infoPadding: '38px 40px',
    kickerFontSize: '10px',
    kickerLetterSpacing: '0.24em',
    titleFontSize: '36px',
    titleMargin: '8px 0 18px',
    quoteBorderLeft: '2px solid var(--reda-gold)',
    quotePadding: '14px 20px',
    quoteMarginBottom: '22px',
    quoteMarkSize: '24px',
    quoteMarkSpacing: '6px',
    quoteFontSize: '17.5px',
    bioFontSize: '15px',
    bioLineHeight: 1.65,
    bioParaMargin: '0 0 14px',
    bioEmptyFontSize: '13.5px',
    lifedateFontSize: '11px',
    lifedateLetterSpacing: '0.1em',
    lifedatePadding: '5px 14px',
    contactGap: '7px',
    contactFontSize: '11px',
    contactIconSize: 13,
    containerBoxShadow: '0 40px 100px rgba(0, 0, 0, 0.85)',
  },
  mobile_landscape: {
    containerWidth: 'min(667px, 94%)',
    containerMaxHeight: 'min(335px, calc(100% - 24px))',
    backdropPadding: '54px 16px 16px',
    colWidth: '130px',
    portraitSize: 68,
    portraitBorder: '1.5px solid var(--reda-gold)',
    iconSize: 30,
    colPadding: '0',
    colGap: '8px',
    closeIconSize: 13,
    closeStyle: { pointerEvents: 'none', top: '10px', right: '10px', width: '30px', height: '30px' },
    infoPadding: '14px 18px',
    kickerFontSize: '8.5px',
    kickerLetterSpacing: '0.18em',
    titleFontSize: '20px',
    titleMargin: '3px 0 8px',
    quoteBorderLeft: '2px solid var(--reda-gold)',
    quotePadding: '8px 14px',
    quoteMarginBottom: '12px',
    quoteMarkSize: '16px',
    quoteMarkSpacing: '4px',
    quoteFontSize: '13px',
    bioFontSize: '12.5px',
    bioLineHeight: 1.5,
    bioParaMargin: '0 0 8px',
    bioEmptyFontSize: '11.5px',
    lifedateFontSize: '9px',
    lifedateLetterSpacing: '0.08em',
    lifedatePadding: '2px 8px',
    contactGap: '3px',
    contactFontSize: '9px',
    contactIconSize: 11,
    containerBoxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
  },
};

export function ArtistViewerPreview({ artist, isNew }: ArtistViewerPreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>('pc');

  const portraitUrl = artist?.portrait_file_id
    ? getImageUrl(artist.portrait_file_id, 'gallery')
    : null;

  const artistName = artist?.name || (isNew ? 'New Artist' : 'Artist Name');
  const lifeDates = artist?.life_dates || null;
  const quote = artist?.quote || null;
  const bio = artist?.biography || null;
  const contact = artist?.contact_info || null;

  const cfg = DEVICE_CONFIG[device];

  return (
    <div
      className="wb-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        background: 'var(--reda-wall-deep)',
      }}
    >
      {/* Top Header Bar with Mode and Device Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '20px',
          right: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--reda-ui)',
            fontSize: '10.5px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--reda-gold)',
            background: 'rgba(27, 26, 23, 0.92)',
            border: '1px solid rgba(185, 138, 60, 0.3)',
            borderRadius: '999px',
            padding: '6px 14px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'auto',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--reda-sage)',
              boxShadow: '0 0 6px var(--reda-sage)',
            }}
          />
          {isNew
            ? 'Curate · New Artist Dossier'
            : artist
            ? `Visitor Preview · ${artist.name}`
            : 'Visitor Preview · Artist Dossier'}
        </div>

        <div
          className="wb-pill"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(23, 21, 17, 0.92)',
            border: '1px solid rgba(185, 138, 60, 0.25)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            borderRadius: '999px',
            padding: '3px',
            display: 'inline-flex',
            gap: '2px',
          }}
          role="group"
          aria-label="Preview device viewport"
        >
          {(['pc', 'mobile_landscape'] as PreviewDevice[]).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              title={d === 'pc' ? 'Preview Desktop / PC Visitor View' : 'Preview Mobile Landscape Visitor View'}
              style={{
                fontFamily: 'var(--reda-ui)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                padding: '6px 14px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: device === d ? 'var(--reda-gold)' : 'transparent',
                color: device === d ? 'var(--reda-char)' : 'var(--reda-cream)',
                boxShadow: device === d ? '0 2px 8px rgba(185, 138, 60, 0.4)' : 'none',
              }}
            >
              {d === 'pc' ? (
                <><Icon name="cube" size={12} /> PC View</>
              ) : (
                <>
                  <span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}>
                    <Icon name="phone" size={12} />
                  </span>
                  Mobile Landscape
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {!artist && !isNew ? (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            color: 'var(--reda-muted)',
            fontFamily: 'var(--reda-text)',
            fontSize: '15px',
            maxWidth: '420px',
            lineHeight: 1.65,
            zIndex: 10,
            padding: '32px 24px',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(35, 32, 25, 0.6) 0%, transparent 70%)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 35%, var(--reda-char-3), var(--reda-char))',
              border: '1.5px solid var(--reda-gold)',
              boxShadow: '0 0 24px rgba(185, 138, 60, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              color: 'var(--reda-gold)',
            }}
          >
            <Icon name="users" size={28} />
          </div>
          <div
            style={{
              fontFamily: 'var(--reda-ui)',
              fontSize: '10.5px',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--reda-gold)',
              marginBottom: '6px',
            }}
          >
            Archive · Artist Dossier
          </div>
          <h2
            style={{
              fontFamily: 'var(--reda-display)',
              fontWeight: 400,
              fontSize: '28px',
              color: 'var(--reda-cream-hi)',
              margin: '0 0 10px',
            }}
          >
            No Artist Selected
          </h2>
          <p style={{ margin: 0, color: 'var(--reda-muted-hi)', fontSize: '14.5px' }}>
            Select an artist from the left archive or create a new profile to preview how their biography, portrait, and quotes appear to visitors in the 3D gallery.
          </p>
        </div>
      ) : (
        /* Preview Viewport Stage */
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Simulated 3D Gallery Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 40%, #2a2520 0%, #151310 50%, #0d0c0a 100%)',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {/* Gallery Floor */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '24%',
                background: 'linear-gradient(to bottom, #110f0d 0%, #080706 100%)',
                borderTop: '1px solid rgba(185, 138, 60, 0.12)',
              }}
            />
            {/* Left framed artwork */}
            <div
              style={{
                position: 'absolute',
                top: '18%',
                left: '6%',
                width: '180px',
                height: '260px',
                border: '10px solid #2e261d',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.6)',
                background: 'radial-gradient(circle, #3e3226 0%, #181410 100%)',
                opacity: 0.7,
              }}
            />
            {/* Central framed masterpiece */}
            <div
              style={{
                position: 'absolute',
                top: '12%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '320px',
                height: '380px',
                border: '14px solid #3d3224',
                boxShadow: '0 24px 60px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.8)',
                background: 'radial-gradient(circle at 50% 35%, #4a3d2e 0%, #1a1612 100%)',
                opacity: 0.65,
              }}
            />
            {/* Right blurred focus panel */}
            <div
              style={{
                position: 'absolute',
                top: '10%',
                right: '4%',
                width: '210px',
                bottom: '12%',
                background: 'rgba(23, 20, 16, 0.85)',
                border: '1px solid rgba(185, 138, 60, 0.25)',
                borderRadius: '8px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                padding: '16px',
                opacity: 0.5,
              }}
            >
              <div style={{ width: '60px', height: '8px', background: 'var(--reda-gold)', opacity: 0.6, marginBottom: '12px' }} />
              <div style={{ width: '140px', height: '14px', background: 'var(--reda-cream)', opacity: 0.4, marginBottom: '8px' }} />
              <div style={{ width: '100px', height: '10px', background: 'var(--reda-muted)', opacity: 0.3, marginBottom: '16px' }} />
              <div style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Visitor Modal Backdrop Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 9, 7, 0.62)',
              backdropFilter: 'blur(7px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: cfg.backdropPadding,
            }}
          >
            {/* Modal Container — same structure for both devices, only cfg values differ */}
            <div
              className="artist-modal-container"
              style={{
                position: 'relative',
                width: cfg.containerWidth,
                maxHeight: cfg.containerMaxHeight,
                boxShadow: cfg.containerBoxShadow,
                cursor: 'default',
                border: '1px solid rgba(185, 138, 60, 0.28)',
                borderRadius: '12px',
                background: 'var(--reda-char-2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
              }}
            >
              <button
                type="button"
                className="artist-modal-close"
                aria-label="Close artist profile"
                style={cfg.closeStyle}
              >
                <Icon name="close" size={cfg.closeIconSize} />
              </button>

              <div
                className="artist-modal-content"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  alignItems: 'stretch',
                  flex: 1,
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {/* Left Column: Portrait, Life Dates, Contact */}
                <div
                  className="artist-modal-portrait-col"
                  style={{
                    background: 'var(--reda-char-3)',
                    padding: cfg.colPadding,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    borderRight: '1px solid rgba(185, 138, 60, 0.18)',
                    overflow: 'hidden',
                    position: 'relative',
                    height: '100%',
                    minHeight: '100%',
                  }}
                >
                  {portraitUrl ? (
                    <div
                      className="artist-portrait-wrapper"
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <img
                        src={portraitUrl}
                        alt={artistName}
                        className="artist-portrait-img"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {(lifeDates || contact) && (
                        <div
                          className="artist-portrait-bottom-overlay"
                          style={{
                            position: 'relative',
                            zIndex: 2,
                            padding: '24px 16px 16px',
                            background:
                              'linear-gradient(to top, rgba(16, 16, 21, 0.95) 0%, rgba(16, 16, 21, 0.6) 65%, transparent 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: cfg.colGap,
                          }}
                        >
                          {lifeDates && (
                            <div
                              className="artist-lifedates-badge"
                              style={{
                                fontFamily: 'var(--reda-ui)',
                                fontSize: cfg.lifedateFontSize,
                                letterSpacing: cfg.lifedateLetterSpacing,
                                color: 'var(--reda-gold)',
                                border: '1px solid rgba(185, 138, 60, 0.4)',
                                borderRadius: '999px',
                                padding: cfg.lifedatePadding,
                                background: 'rgba(27, 26, 23, 0.75)',
                                backdropFilter: 'blur(4px)',
                              }}
                            >
                              {lifeDates}
                            </div>
                          )}
                          {contact && (
                            <div
                              className="artist-contact-box"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: cfg.contactGap,
                                fontFamily: 'var(--reda-ui)',
                                fontSize: cfg.contactFontSize,
                                color: 'var(--reda-muted-hi)',
                              }}
                            >
                              <span className="artist-contact-icon">
                                <Icon name="pin" size={cfg.contactIconSize} />
                              </span>
                              <span className="artist-contact-text">{contact}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="artist-portrait-placeholder"
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: cfg.colGap,
                        padding: '24px 16px',
                        boxSizing: 'border-box',
                        background:
                          'radial-gradient(circle at 50% 50%, var(--reda-char-2), var(--reda-wall-deepest))',
                      }}
                    >
                      <div
                        className="artist-portrait-circle"
                        style={{
                          width: cfg.portraitSize,
                          height: cfg.portraitSize,
                          borderRadius: '50%',
                          border: cfg.portraitBorder,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--reda-gold)',
                          background: 'rgba(185, 138, 60, 0.05)',
                          margin: '0 auto',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="user" size={cfg.iconSize} />
                      </div>

                      {lifeDates && (
                        <div
                          className="artist-lifedates-badge"
                          style={{
                            fontFamily: 'var(--reda-ui)',
                            fontSize: cfg.lifedateFontSize,
                            letterSpacing: cfg.lifedateLetterSpacing,
                            color: 'var(--reda-gold)',
                            border: '1px solid rgba(185, 138, 60, 0.4)',
                            borderRadius: '999px',
                            padding: cfg.lifedatePadding,
                            background: 'rgba(27, 26, 23, 0.75)',
                            backdropFilter: 'blur(4px)',
                            margin: '0 auto',
                            flexShrink: 0,
                          }}
                        >
                          {lifeDates}
                        </div>
                      )}

                      {contact && (
                        <div
                          className="artist-contact-box"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: cfg.contactGap,
                            fontFamily: 'var(--reda-ui)',
                            fontSize: cfg.contactFontSize,
                            color: 'var(--reda-muted-hi)',
                            margin: '0 auto',
                            flexShrink: 0,
                          }}
                        >
                          <span className="artist-contact-icon">
                            <Icon name="pin" size={cfg.contactIconSize} />
                          </span>
                          <span className="artist-contact-text">{contact}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Name, Quote, Bio */}
                <div
                  className="artist-modal-info-col"
                  style={{ padding: cfg.infoPadding, overflowY: 'auto', maxHeight: '100%' }}
                >
                  <header className="artist-header">
                    <span
                      className="artist-kicker"
                      style={{
                        fontFamily: 'var(--reda-ui)',
                        fontSize: cfg.kickerFontSize,
                        fontWeight: 700,
                        letterSpacing: cfg.kickerLetterSpacing,
                        textTransform: 'uppercase',
                        color: 'var(--reda-gold)',
                      }}
                    >
                      Featured Artist
                    </span>
                    <h1
                      id="artist-modal-name"
                      className="artist-name"
                      style={{
                        fontFamily: 'var(--reda-display)',
                        fontWeight: 500,
                        fontSize: cfg.titleFontSize,
                        color: 'var(--reda-cream-hi)',
                        margin: cfg.titleMargin,
                      }}
                    >
                      {artistName}
                    </h1>
                  </header>

                  {quote && (
                    <blockquote
                      className="artist-quote"
                      style={{
                        borderLeft: cfg.quoteBorderLeft,
                        padding: cfg.quotePadding,
                        margin: `0 0 ${cfg.quoteMarginBottom}`,
                        position: 'relative',
                        background: 'linear-gradient(90deg, rgba(185, 138, 60, 0.08) 0%, rgba(185, 138, 60, 0.02) 65%, transparent 100%)',
                        borderRadius: '0 6px 6px 0',
                      }}
                    >
                      <span
                        className="quote-mark"
                        style={{
                          fontFamily: 'var(--reda-display)',
                          fontSize: cfg.quoteMarkSize,
                          color: 'var(--reda-gold)',
                          lineHeight: 0,
                          marginRight: cfg.quoteMarkSpacing,
                          opacity: 0.85,
                          verticalAlign: '-3px',
                          userSelect: 'none',
                        }}
                      >
                        “
                      </span>
                      <p
                        style={{
                          fontFamily: 'var(--reda-text)',
                          fontStyle: 'italic',
                          fontSize: cfg.quoteFontSize,
                          color: 'var(--reda-cream-hi)',
                          margin: 0,
                          display: 'inline',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {quote}
                      </p>
                      <span
                        className="quote-mark closing"
                        style={{
                          fontFamily: 'var(--reda-display)',
                          fontSize: cfg.quoteMarkSize,
                          color: 'var(--reda-gold)',
                          lineHeight: 0,
                          marginLeft: cfg.quoteMarkSpacing,
                          opacity: 0.85,
                          verticalAlign: '-6px',
                          userSelect: 'none',
                        }}
                      >
                        ”
                      </span>
                    </blockquote>
                  )}

                  {bio ? (
                    <div className="artist-bio-body">
                      {bio.split('\n\n').map((paragraph, idx) => (
                        <p
                          key={idx}
                          style={{
                            fontFamily: 'var(--reda-text)',
                            fontSize: cfg.bioFontSize,
                            color: 'var(--reda-cream)',
                            lineHeight: cfg.bioLineHeight,
                            margin: cfg.bioParaMargin,
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="artist-bio-empty" style={{ fontSize: cfg.bioEmptyFontSize, color: 'var(--reda-muted)' }}>
                      Biography not available for this artist.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
