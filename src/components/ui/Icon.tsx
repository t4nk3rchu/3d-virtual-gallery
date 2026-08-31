const PATHS = {
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
  external: 'M6 3H3v10h10v-3M9 3h4v4M13 3l-6 6',
  trash: 'M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9',
  google: 'M13.5 8.2c0-.5 0-.9-.1-1.3H8v2.6h3.1a2.7 2.7 0 0 1-1.1 1.8v1.5h1.8c1.1-1 1.7-2.5 1.7-4.6z M8 14c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5a3.3 3.3 0 0 1-3.1-2.3H3v1.5A5.6 5.6 0 0 0 8 14z M4.9 9.5a3.3 3.3 0 0 1 0-2.1V5.9H3a5.6 5.6 0 0 0 0 5z M8 4.6c.8 0 1.6.3 2.2.9l1.6-1.6A5.5 5.5 0 0 0 3 5.9l1.9 1.5A3.3 3.3 0 0 1 8 4.6z',
  film: 'M2.5 3h11v10h-11zM5 3v10M11 3v10M2.5 6.5h2.5M11 6.5h2.5M2.5 9.5h2.5M11 9.5h2.5',
  palette: 'M8 2a6 6 0 0 0 0 12c1 0 1.3-.7 1-1.3-.4-.7 0-1.7 1-1.7h1a3 3 0 0 0 3-3c0-3.3-2.9-6-6-6zM5 6.5h.01M8 5h.01M11 6.5h.01M10.5 9.5h.01',
  audio: 'M4 6v4M6.5 4v8M9 6.5v3M11.5 5v6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17, title, className = '' }:
  { name: IconName; size?: number; title?: string; className?: string }) {
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return (
    <svg className={`reda-icon ${className}`} width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"
      strokeLinejoin="round" {...(a11y as object)}>
      {title && <title>{title}</title>}
      <path d={PATHS[name]} />
    </svg>
  );
}
