// BroadcasterLogo — large top-right brand mark for the broadcast overlay.
// Visibility is owned by LiveGameOverlay; this component renders unconditionally
// when mounted and trusts its caller to skip rendering when the URL is missing.

export default function BroadcasterLogo({ src, alt = 'Broadcaster logo' }) {
  if (!src) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        width: 112,
        height: 112,
        background: 'transparent',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 30,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );
}
