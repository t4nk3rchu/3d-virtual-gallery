-- Migration 0002: Seed default platform gallery rooms
INSERT OR IGNORE INTO rooms (id, owner_user_id, name, description, thumbnail_url, glb_file_id, glb_source, spawn_json, is_public, created_at)
VALUES 
  (
    'room-default-white-cube',
    NULL,
    'Modern White Cube Gallery',
    'Contemporary gallery space with white walls, polished concrete floor, and ambient exhibition lighting.',
    NULL,
    'default-white-cube',
    'platform_drive',
    '{"position":[0, 1.6, -6], "target":[0, 1.6, 0]}',
    1,
    strftime('%s', 'now')
  ),
  (
    'room-default-grand-hall',
    NULL,
    'Classic Grand Museum Hall',
    'Spacious high-ceiling gallery hall with warm hardwood flooring and museum perimeter walls.',
    NULL,
    'default-grand-hall',
    'platform_drive',
    '{"position":[0, 1.6, -8], "target":[0, 1.6, 0]}',
    1,
    strftime('%s', 'now')
  ),
  (
    'room-default-minimal-studio',
    NULL,
    'Minimalist Exhibition Studio',
    'Intimate minimalist gallery room optimized for focused collections and digital art.',
    NULL,
    'default-minimal-studio',
    'platform_drive',
    '{"position":[0, 1.6, -5], "target":[0, 1.6, 0]}',
    1,
    strftime('%s', 'now')
  );
