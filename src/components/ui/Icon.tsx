import {
  MousePointer2,
  Frame,
  MapPin,
  Box,
  User,
  Users,
  Settings,
  X,
  Volume2,
  VolumeX,
  Map,
  Maximize,
  Play,
  ZoomIn,
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Trash2,
  Film,
  Palette,
  AudioLines,
  Footprints,
  Mouse,
  Crosshair,
  Info,
  Search,
  RotateCcw,
  RotateCw,
  Minimize2,
  Maximize2,
  List,
  Pause,
  Smartphone,
  Lock,
  Shield,
  ArrowRight,
  type LucideProps,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentType } from 'react';

/**
 * Authentic Google G brand mark for Google authentication.
 * (Lucide intentionally excludes commercial corporate brand trademarks).
 */
function GoogleIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M13.5 8.2c0-.5 0-.9-.1-1.3H8v2.6h3.1a2.7 2.7 0 0 1-1.1 1.8v1.5h1.8c1.1-1 1.7-2.5 1.7-4.6z" />
      <path d="M8 14c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5a3.3 3.3 0 0 1-3.1-2.3H3v1.5A5.6 5.6 0 0 0 8 14z" />
      <path d="M4.9 9.5a3.3 3.3 0 0 1 0-2.1V5.9H3a5.6 5.6 0 0 0 0 5z" />
      <path d="M8 4.6c.8 0 1.6.3 2.2.9l1.6-1.6A5.5 5.5 0 0 0 3 5.9l1.9 1.5A3.3 3.3 0 0 1 8 4.6z" />
    </svg>
  );
}

export const ICONS: Record<string, LucideIcon | ComponentType<LucideProps>> = {
  select: MousePointer2,
  frame: Frame,
  pin: MapPin,
  cube: Box,
  user: User,
  users: Users,
  gear: Settings,
  close: X,
  sound: Volume2,
  soundMute: VolumeX,
  map: Map,
  fullscreen: Maximize,
  play: Play,
  inspect: ZoomIn,
  plus: Plus,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  external: ExternalLink,
  trash: Trash2,
  google: GoogleIcon,
  film: Film,
  palette: Palette,
  audio: AudioLines,
  walk: Footprints,
  mouse: Mouse,
  target: Crosshair,
  info: Info,
  search: Search,
  reset: RotateCcw,
  refresh: RotateCw,
  minimize: Minimize2,
  maximize: Maximize2,
  list: List,
  pause: Pause,
  phone: Smartphone,
  lock: Lock,
  shield: Shield,
  arrowRight: ArrowRight,
  'arrow-right': ArrowRight,
} as const;

export type IconName =
  | 'select'
  | 'frame'
  | 'pin'
  | 'cube'
  | 'user'
  | 'users'
  | 'gear'
  | 'close'
  | 'sound'
  | 'soundMute'
  | 'map'
  | 'fullscreen'
  | 'play'
  | 'inspect'
  | 'plus'
  | 'chevronRight'
  | 'chevronLeft'
  | 'chevronUp'
  | 'chevronDown'
  | 'external'
  | 'trash'
  | 'google'
  | 'film'
  | 'palette'
  | 'audio'
  | 'walk'
  | 'mouse'
  | 'target'
  | 'info'
  | 'search'
  | 'reset'
  | 'refresh'
  | 'minimize'
  | 'maximize'
  | 'list'
  | 'pause'
  | 'phone'
  | 'lock'
  | 'shield'
  | 'arrowRight'
  | 'arrow-right';

export interface IconProps {
  name: IconName;
  size?: number;
  title?: string;
  className?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 17,
  title,
  className = '',
  strokeWidth = 1.75,
}: IconProps) {
  const Component = ICONS[name] || Info;
  const a11y = title
    ? { role: 'img', 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={`reda-icon ${className}`.trim()}
      {...a11y}
    >
      {title ? <title>{title}</title> : null}
    </Component>
  );
}

// Re-export Lucide primitives for components that prefer direct imports
export {
  MousePointer2,
  Frame,
  MapPin,
  Box,
  User,
  Users,
  Settings,
  X,
  Volume2,
  VolumeX,
  Map,
  Maximize,
  Play,
  ZoomIn,
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Trash2,
  Film,
  Palette,
  AudioLines,
  Footprints,
  Mouse,
  Crosshair,
  Info,
  Search,
  RotateCcw,
  RotateCw,
  Minimize2,
  Maximize2,
  List,
  Pause,
  Smartphone,
  Lock,
  Shield,
  ArrowRight,
};
