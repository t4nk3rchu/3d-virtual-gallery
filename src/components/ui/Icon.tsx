const PATHS: Record<string, string | readonly string[]> = {
  select: 'M3 2l10 4.2-4 1.1-1.1 4z',
  frame: 'M3 3.2h10v9.6H3z',
  pin: 'M8 3.6a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM8 9.2V14',
  cube: 'M8 2.2l5 2.8v6L8 13.8 3 11V5zM3 5l5 2.8L13 5M8 7.8v6',
  user: 'M8 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4 13.6c0-2.6 8-2.6 8 0',
  users: 'M6 4a2.2 2.2 0 1 0 0 4.4A2.2 2.2 0 0 0 6 4zM2.5 13c0-2.3 7-2.3 7 0M11 5.2a1.8 1.8 0 1 1 .01 3.6M11.5 9.4c2 .2 3 1.1 3 2.6',
  gear: 'M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM8 2.4v2M8 11.6v2M2.4 8h2M11.6 8h2M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M11.8 4.2l-1.4 1.4M5.6 10.4l-1.4 1.4',
  close: 'M4 4l8 8M12 4l-8 8',
  sound: 'M3 6v4h2.5L9 13V3L5.5 6zM11 5.5a3.5 3.5 0 0 1 0 5',
  map: 'M6 3L2 5v8l4-2 4 2 4-2V3l-4 2-4-2zM6 3v8M10 5v8',
  fullscreen: 'M2 5V2h3M14 5V2h-3M2 11v3h3M14 11v3h-3',
  play: 'M5 3l8 5-8 5z',
  inspect: 'M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4M8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  plus: 'M8 3v10M3 8h10',
  chevronRight: 'M6 3l5 5-5 5',
  chevronLeft: 'M10 3l-5 5 5 5',
  chevronUp: 'M3 10l5-5 5 5',
  chevronDown: 'M3 6l5 5 5-5',
  external: 'M6 3H3v10h10v-3M9 3h4v4M13 3l-6 6',
  trash: 'M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9',
  google: 'M13.5 8.2c0-.5 0-.9-.1-1.3H8v2.6h3.1a2.7 2.7 0 0 1-1.1 1.8v1.5h1.8c1.1-1 1.7-2.5 1.7-4.6z M8 14c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5a3.3 3.3 0 0 1-3.1-2.3H3v1.5A5.6 5.6 0 0 0 8 14z M4.9 9.5a3.3 3.3 0 0 1 0-2.1V5.9H3a5.6 5.6 0 0 0 0 5z M8 4.6c.8 0 1.6.3 2.2.9l1.6-1.6A5.5 5.5 0 0 0 3 5.9l1.9 1.5A3.3 3.3 0 0 1 8 4.6z',
  film: 'M2.5 3h11v10h-11zM5 3v10M11 3v10M2.5 6.5h2.5M11 6.5h2.5M2.5 9.5h2.5M11 9.5h2.5',
  palette: 'M8 2a6 6 0 0 0 0 12c1 0 1.3-.7 1-1.3-.4-.7 0-1.7 1-1.7h1a3 3 0 0 0 3-3c0-3.3-2.9-6-6-6zM5 6.5h.01M8 5h.01M11 6.5h.01M10.5 9.5h.01',
  audio: 'M4 6v4M6.5 4v8M9 6.5v3M11.5 5v6',
  walk: ['M8 2.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4', 'M8 5.4L6.3 7.7l.9 2.5-1.3 3.4M8 5.4l1.7 1.2 2 .6M7.3 10.2l1.9 1.6.6 2.8'],
  mouse: ['M8 2.4a2.9 2.9 0 0 0-2.9 2.9v5.4a2.9 2.9 0 0 0 5.8 0V5.3A2.9 2.9 0 0 0 8 2.4z', 'M8 5v2.4'],
  target: ['M8 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z', 'M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z'],
  info: ['M8 2.4a5.6 5.6 0 1 0 0 11.2 5.6 5.6 0 0 0 0-11.2z', 'M8 7.4v3.4', 'M8 5.2h.01'],
  search: ['M7.2 2.8a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8z', 'M10.5 10.5l2.7 2.7'],
  reset: ['M3.2 4v3.1h3.1', 'M3.7 7.1A5 5 0 1 1 3.3 10'],
  minimize: 'M4 8h8',
  maximize: ['M3 6V3h3', 'M13 6V3h-3', 'M3 10v3h3', 'M13 10v3h-3'],
  list: ['M6 4.5h8', 'M6 8h8', 'M6 11.5h8', 'M3 4.5h.01', 'M3 8h.01', 'M3 11.5h.01'],
  pause: ['M6 3.5v9', 'M10 3.5v9'],
  phone: ['M5 2.6h6v10.8H5z', 'M7.4 11.6h1.2'],
  lock: ['M4.5 7V5a3.5 3.5 0 0 1 7 0v2', 'M3 7h10v7H3z', 'M8 9.5v2'],
  shield: 'M8 2l5.5 2.2v4.3c0 3.6-2.5 6.2-5.5 7.5-3-1.3-5.5-3.9-5.5-7.5V4.2z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17, title, className = '' }:
  { name: IconName; size?: number; title?: string; className?: string }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  const d = PATHS[name];
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg className={`reda-icon ${className}`} width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" {...(a11y as object)}>
      {title && <title>{title}</title>}
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}
