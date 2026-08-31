import { useState } from 'react';
import type { Artist } from '../../../types/schema';
import { getImageUrl } from '../../../lib/media/gdrive';
import { Icon } from '../../ui';

interface ArtistViewerPreviewProps {
  artist: Artist | null;
  isNew?: boolean;
}

type PreviewDevice = 'pc' | 'mobile_landscape';

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
          <button
            type="button"
            aria-pressed={device === 'pc'}
            onClick={() => setDevice('pc')}
            title="Preview Desktop / PC Visitor View"
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
              background: device === 'pc' ? 'var(--reda-gold)' : 'transparent',
              color: device === 'pc' ? 'var(--reda-char)' : 'var(--reda-cream)',
              boxShadow: device === 'pc' ? '0 2px 8px rgba(185, 138, 60, 0.4)' : 'none',
            }}
          >
            <Icon name="cube" size={12} /> PC View
          </button>
          <button
            type="button"
            aria-pressed={device === 'mobile_landscape'}
            onClick={() => setDevice('mobile_landscape')}
            title="Preview Mobile Landscape Visitor View"
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
              background: device === 'mobile_landscape' ? 'var(--reda-gold)' : 'transparent',
              color: device === 'mobile_landscape' ? 'var(--reda-char)' : 'var(--reda-cream)',
              boxShadow: device === 'mobile_landscape' ? '0 2px 8px rgba(185, 138, 60, 0.4)' : 'none',
            }}
          >
            <span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}>
              <Icon name="phone" size={12} />
            </span>
            Mobile Landscape
          </button>
        </div>
      </div>

      {!artist && !isNew ? (
        /* Renaissance Codex Empty State */
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
          {/* Simulated 3D Gallery Backdrop (Wall, Spotlights, Framed Paintings, and Focus Panel) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 40%, #2a2520 0%, #151310 50%, #0d0c0a 100%)',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {/* Gallery Floor Line */}
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

            {/* Simulated Framed Artwork on left wall */}
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

            {/* Simulated Central Framed Masterpiece on wall */}
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

            {/* Simulated Blurred Focus Panel on right edge */}
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

          {/* Authentic Visitor Modal Backdrop Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(10, 9, 7, 0.62)',
              backdropFilter: 'blur(7px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: device === 'pc' ? '64px 24px 24px' : '54px 16px 16px',
            }}
          >
            {device === 'pc' ? (
              /* Desktop PC Mode: Full Stately 2-Column Modal */
              <div
                className="artist-modal-container"
                style={{
                  position: 'relative',
                  width: 'min(860px, 92%)',
                  maxHeight: 'min(620px, calc(100% - 48px))',
                  boxShadow: '0 40px 100px rgba(0, 0, 0, 0.85)',
                  cursor: 'default',
                  border: '1px solid rgba(185, 138, 60, 0.28)',
                  borderRadius: '12px',
                  background: 'var(--reda-char-2)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  className="artist-modal-close"
                  aria-label="Close artist profile"
                  style={{ pointerEvents: 'none' }}
                >
                  <Icon name="close" size={16} />
                </button>

                <div
                  className="artist-modal-content"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '280px 1fr',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                  }}
                >
                  {/* Left Column: Portrait & Life Dates */}
                  <div
                    className="artist-modal-portrait-col"
                    style={{
                      background: 'var(--reda-char-3)',
                      padding: '32px 26px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      borderRight: '1px solid rgba(185, 138, 60, 0.18)',
                      overflowY: 'auto',
                    }}
                  >
                    {portraitUrl ? (
                      <div
                        className="artist-portrait-wrapper"
                        style={{
                          width: '180px',
                          height: '180px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid var(--reda-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={portraitUrl}
                          alt={artistName}
                          className="artist-portrait-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="artist-portrait-placeholder"
                        style={{
                          width: '180px',
                          height: '180px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '2px solid var(--reda-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'radial-gradient(circle at 50% 35%, var(--reda-char-3), var(--reda-char))',
                          color: 'var(--reda-muted-2)',
                        }}
                      >
                        <Icon name="user" size={56} />
                      </div>
                    )}

                    {lifeDates && (
                      <div
                        className="artist-lifedates-badge"
                        style={{
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '11px',
                          letterSpacing: '0.1em',
                          color: 'var(--reda-gold)',
                          border: '1px solid rgba(185, 138, 60, 0.4)',
                          borderRadius: '999px',
                          padding: '5px 14px',
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
                          gap: '7px',
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '11px',
                          color: 'var(--reda-muted-hi)',
                        }}
                      >
                        <span className="artist-contact-icon">
                          <Icon name="pin" size={13} />
                        </span>
                        <span className="artist-contact-text">{contact}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Bio & Quotes */}
                  <div
                    className="artist-modal-info-col"
                    style={{
                      padding: '38px 40px',
                      overflowY: 'auto',
                      maxHeight: '100%',
                    }}
                  >
                    <header className="artist-header">
                      <span
                        className="artist-kicker"
                        style={{
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.24em',
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
                          fontSize: '36px',
                          color: 'var(--reda-cream-hi)',
                          margin: '8px 0 18px',
                        }}
                      >
                        {artistName}
                      </h1>
                    </header>

                    {quote && (
                      <blockquote
                        className="artist-quote"
                        style={{
                          borderLeft: '3px solid var(--reda-oxblood)',
                          padding: '4px 0 4px 20px',
                          margin: '0 0 20px',
                          position: 'relative',
                        }}
                      >
                        <span
                          className="quote-mark"
                          style={{
                            fontFamily: 'var(--reda-display)',
                            fontSize: '34px',
                            color: 'var(--reda-gold)',
                            lineHeight: 0,
                            marginRight: '4px',
                          }}
                        >
                          “
                        </span>
                        <p
                          style={{
                            fontFamily: 'var(--reda-text)',
                            fontStyle: 'italic',
                            fontSize: '17px',
                            color: 'var(--reda-cream)',
                            margin: 0,
                            display: 'inline',
                          }}
                        >
                          {quote}
                        </p>
                        <span
                          className="quote-mark closing"
                          style={{
                            fontFamily: 'var(--reda-display)',
                            fontSize: '34px',
                            color: 'var(--reda-gold)',
                            lineHeight: 0,
                            marginLeft: '4px',
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
                              fontSize: '15px',
                              color: 'var(--reda-cream)',
                              lineHeight: 1.65,
                              margin: '0 0 14px',
                            }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="artist-bio-empty" style={{ fontSize: '13.5px', color: 'var(--reda-muted)' }}>
                        Biography not available for this artist.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Mobile Landscape Mode: Compact Horizontal View matching real mobile landscape (Image 2) */
              <div
                className="artist-modal-container"
                style={{
                  position: 'relative',
                  width: 'min(667px, 94%)',
                  maxHeight: 'min(335px, calc(100% - 24px))',
                  boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
                  cursor: 'default',
                  border: '1px solid rgba(185, 138, 60, 0.28)',
                  borderRadius: '12px',
                  background: 'var(--reda-char-2)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  className="artist-modal-close"
                  aria-label="Close artist profile"
                  style={{ pointerEvents: 'none', top: '10px', right: '10px', width: '30px', height: '30px' }}
                >
                  <Icon name="close" size={13} />
                </button>

                <div
                  className="artist-modal-content"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1fr',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden',
                  }}
                >
                  {/* Left Column: Portrait & Life Dates */}
                  <div
                    className="artist-modal-portrait-col"
                    style={{
                      background: 'var(--reda-char-3)',
                      padding: '14px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      borderRight: '1px solid rgba(185, 138, 60, 0.18)',
                      overflowY: 'auto',
                    }}
                  >
                    {portraitUrl ? (
                      <div
                        className="artist-portrait-wrapper"
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '1.5px solid var(--reda-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={portraitUrl}
                          alt={artistName}
                          className="artist-portrait-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="artist-portrait-placeholder"
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: '1.5px solid var(--reda-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'radial-gradient(circle at 50% 35%, var(--reda-char-3), var(--reda-char))',
                          color: 'var(--reda-muted-2)',
                        }}
                      >
                        <Icon name="user" size={34} />
                      </div>
                    )}

                    {lifeDates && (
                      <div
                        className="artist-lifedates-badge"
                        style={{
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '9px',
                          letterSpacing: '0.08em',
                          color: 'var(--reda-gold)',
                          border: '1px solid rgba(185, 138, 60, 0.4)',
                          borderRadius: '999px',
                          padding: '2px 8px',
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
                          gap: '3px',
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '9px',
                          color: 'var(--reda-muted-hi)',
                        }}
                      >
                        <span className="artist-contact-icon">
                          <Icon name="pin" size={11} />
                        </span>
                        <span className="artist-contact-text">{contact}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Bio & Quotes */}
                  <div
                    className="artist-modal-info-col"
                    style={{
                      padding: '14px 18px',
                      overflowY: 'auto',
                      maxHeight: '100%',
                    }}
                  >
                    <header className="artist-header">
                      <span
                        className="artist-kicker"
                        style={{
                          fontFamily: 'var(--reda-ui)',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          letterSpacing: '0.18em',
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
                          fontSize: '20px',
                          color: 'var(--reda-cream-hi)',
                          margin: '3px 0 8px',
                        }}
                      >
                        {artistName}
                      </h1>
                    </header>

                    {quote && (
                      <blockquote
                        className="artist-quote"
                        style={{
                          borderLeft: '2.5px solid var(--reda-oxblood)',
                          padding: '2px 0 2px 10px',
                          margin: '0 0 10px',
                          position: 'relative',
                        }}
                      >
                        <span
                          className="quote-mark"
                          style={{
                            fontFamily: 'var(--reda-display)',
                            fontSize: '20px',
                            color: 'var(--reda-gold)',
                            lineHeight: 0,
                            marginRight: '2px',
                          }}
                        >
                          “
                        </span>
                        <p
                          style={{
                            fontFamily: 'var(--reda-text)',
                            fontStyle: 'italic',
                            fontSize: '12.5px',
                            color: 'var(--reda-cream)',
                            margin: 0,
                            display: 'inline',
                          }}
                        >
                          {quote}
                        </p>
                        <span
                          className="quote-mark closing"
                          style={{
                            fontFamily: 'var(--reda-display)',
                            fontSize: '20px',
                            color: 'var(--reda-gold)',
                            lineHeight: 0,
                            marginLeft: '2px',
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
                              fontSize: '12.5px',
                              color: 'var(--reda-cream)',
                              lineHeight: 1.5,
                              margin: '0 0 8px',
                            }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="artist-bio-empty" style={{ fontSize: '11.5px', color: 'var(--reda-muted)' }}>
                        Biography not available for this artist.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
