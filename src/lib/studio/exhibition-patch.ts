export interface ExhibitionEditForm {
  title?: string;
  description?: string;
  curator_name?: string;
  start_date?: string;
  end_date?: string;
  cover_image_url?: string;
  room_id?: string;
  intro_video_file_id?: string;
  curation_type?: 'solo' | 'group';
  settings_json?: string | null;
}

const EDITABLE_KEYS: (keyof ExhibitionEditForm)[] = [
  'title',
  'description',
  'curator_name',
  'start_date',
  'end_date',
  'cover_image_url',
  'room_id',
  'intro_video_file_id',
  'curation_type',
  'settings_json',
];

// NOT-NULL columns: never send these as null/empty (the form marks them `required`).
const REQUIRED_KEYS = new Set<keyof ExhibitionEditForm>(['title', 'room_id']);

/**
 * Build the PUT patch from the edit form. Slug is never editable.
 * Optional fields owned by the form send `null` when blanked, so a curator can
 * actually CLEAR a previously-set value (empty string would otherwise be dropped,
 * leaving the stale value in place). Required NOT-NULL columns are never nulled.
 */
export function buildExhibitionPatch(form: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE_KEYS) {
    const v = form[k];
    if (v === undefined) continue;
    if (REQUIRED_KEYS.has(k)) {
      if (v !== '') patch[k] = v; // never null out a NOT-NULL column
    } else {
      patch[k] = v === '' ? null : v; // '' clears an optional column
    }
  }
  return patch;
}
