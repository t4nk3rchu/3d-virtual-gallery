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
  Sun,
  Moon,
  ArrowRight,
  Check,
  AlertTriangle,
  Share2,
  Copy,
  Download,
  Mail,
  QrCode,
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

function FacebookIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function XTwitterIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function WhatsAppIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M17.472 14.382c-.301-.15-1.781-.878-2.057-.978-.276-.1-.477-.15-.678.15-.2.3-.778.978-.953 1.179-.176.2-.351.226-.652.075-.3-.15-1.267-.467-2.414-1.49-1.89-1.685-1.49-1.89-.893-.757-.15-.3-.025-.477.1-.602.125-.125.276-.326.414-.489.138-.163.184-.276.276-.464.092-.188.046-.351-.023-.502-.069-.15-.678-1.636-.928-2.24-.244-.588-.492-.508-.678-.517-.176-.009-.376-.01-.577-.01-.2 0-.527.075-.803.376-.276.3-1.054 1.03-1.054 2.51 0 1.48 1.079 2.91 1.23 3.111.15.2 2.123 3.242 5.144 4.547.719.311 1.281.497 1.719.636.722.23 1.378.197 1.898.12.579-.087 1.781-.728 2.032-1.431.251-.703.251-1.306.176-1.431-.076-.125-.276-.2-.577-.35zM12.042 2C6.518 2 2.03 6.488 2.03 12.012c0 1.98.577 3.824 1.572 5.378L2 22l4.767-1.547c1.488.905 3.228 1.42 5.093 1.42 5.524 0 10.012-4.488 10.012-10.012C21.872 6.488 17.566 2 12.042 2zm0 18.232c-1.634 0-3.151-.482-4.425-1.312l-.317-.208-2.827.919.929-2.756-.226-.339A8.195 8.195 0 0 1 3.822 12.01c0-4.533 3.688-8.222 8.22-8.222 4.532 0 8.22 3.689 8.22 8.222 0 4.533-3.688 8.222-8.22 8.222z" />
    </svg>
  );
}

function TelegramIcon({ size = 16, className = '', ...props }: LucideProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
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
  sun: Sun,
  moon: Moon,
  arrowRight: ArrowRight,
  'arrow-right': ArrowRight,
  check: Check,
  alertTriangle: AlertTriangle,
  share: Share2,
  copy: Copy,
  download: Download,
  mail: Mail,
  qr: QrCode,
  qrCode: QrCode,
  facebook: FacebookIcon,
  x: XTwitterIcon,
  twitter: XTwitterIcon,
  linkedin: LinkedInIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
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
  | 'sun'
  | 'moon'
  | 'arrowRight'
  | 'arrow-right'
  | 'check'
  | 'alertTriangle'
  | 'share'
  | 'copy'
  | 'download'
  | 'mail'
  | 'qr'
  | 'qrCode'
  | 'facebook'
  | 'x'
  | 'twitter'
  | 'linkedin'
  | 'whatsapp'
  | 'telegram';

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
  Sun,
  Moon,
  ArrowRight,
};
