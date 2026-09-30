// Poysha (integer, smallest unit) -> a readable taka string for display only.
// The backend never sends decimals; this is purely presentation.
export function formatPoysha(poysha) {
  if (poysha == null) return '—';
  return `৳${(poysha / 100).toFixed(2)}`;
}
