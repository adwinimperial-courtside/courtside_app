import { motion } from 'framer-motion';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Full-width scrolling marquee at the bottom of the overlay.
// Implements a seamless loop by rendering two copies of the text with 200px
// spacing and animating the inner track by -50% (= width of one unit) on a
// continuous 30-second linear cycle.
//
// Visibility is owned by LiveGameOverlay; this component trusts its caller to
// skip rendering when the text is empty.

export default function StreamerBar({ text }) {
  const message = text?.trim();
  if (!message) return null;

  // One item = the message + 200px right-spacer. Two items back-to-back
  // means the inner track is exactly 2x one item wide; animating x from
  // 0% to -50% advances by one full item, producing a seamless restart.
  const Item = ({ ariaHidden }) => (
    <div
      aria-hidden={ariaHidden || undefined}
      style={{
        flexShrink: 0,
        paddingRight: 200,
        fontSize: 22,
        fontWeight: 600,
        color: '#FFFFFF',
        whiteSpace: 'nowrap',
        lineHeight: '56px',
        fontFamily: FONT,
      }}
    >
      {message}
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        background: 'rgba(15, 15, 26, 0.95)',
        borderTop: '2px solid #3B82F6',
        overflow: 'hidden',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <motion.div
        style={{
          display: 'flex',
          willChange: 'transform',
        }}
        initial={{ x: '0%' }}
        animate={{ x: '-50%' }}
        transition={{
          duration: 30,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        <Item />
        <Item ariaHidden />
      </motion.div>
    </div>
  );
}
