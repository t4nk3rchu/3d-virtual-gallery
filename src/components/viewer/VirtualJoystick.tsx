import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../ui';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  disabled?: boolean;
}

const JOYSTICK_RADIUS = 50; // max displacement radius in px

export function VirtualJoystick({ onMove, disabled = false }: VirtualJoystickProps) {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const moveVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Continuous movement loop while joystick is active
  const tickMovement = useCallback(() => {
    if (moveVectorRef.current.x !== 0 || moveVectorRef.current.y !== 0) {
      onMove(moveVectorRef.current.x, moveVectorRef.current.y);
    }
    if (activePointerIdRef.current !== null) {
      animFrameRef.current = requestAnimationFrame(tickMovement);
    }
  }, [onMove]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    setIsActive(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    updatePosition(e.clientX, e.clientY);

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(tickMovement);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let knobX = dx;
    let knobY = dy;

    if (distance > JOYSTICK_RADIUS) {
      const angle = Math.atan2(dy, dx);
      knobX = Math.cos(angle) * JOYSTICK_RADIUS;
      knobY = Math.sin(angle) * JOYSTICK_RADIUS;
    }

    setKnobPos({ x: knobX, y: knobY });

    // Normalized vectors: x (-1 to 1), y (1 for UP/forward, -1 for DOWN/backward)
    const normX = knobX / JOYSTICK_RADIUS;
    const normY = -knobY / JOYSTICK_RADIUS; // invert Y so up is positive forward

    moveVectorRef.current = { x: normX, y: normY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    moveVectorRef.current = { x: 0, y: 0 };
    onMove(0, 0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  if (disabled) return null;

  return (
    <div
      className={`virtual-joystick ${isActive ? 'active' : ''}`}
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="region"
      aria-label="Virtual navigation joystick"
    >
      <div className="virtual-joystick__ring">
        <span className="joystick-arrow joystick-arrow--up"><Icon name="chevronUp" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--down"><Icon name="chevronDown" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--left"><Icon name="chevronLeft" size={12} /></span>
        <span className="joystick-arrow joystick-arrow--right"><Icon name="chevronRight" size={12} /></span>
      </div>

      <div
        className="virtual-joystick__knob"
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          transition: isActive ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="virtual-joystick__knob-center" />
      </div>
    </div>
  );
}
