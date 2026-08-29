/**
 * A Drive file is "anyone with the link" iff it has a permission of type 'anyone'.
 */
export function isAnyoneWithLink(permissions: Array<{ type: string }>): boolean {
  return permissions.some((p) => p.type === 'anyone');
}
