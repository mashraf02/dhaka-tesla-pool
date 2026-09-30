const COLORS = {
  REQUESTED: '#f59e0b',
  MATCHED: '#3b82f6',
  DRIVER_ARRIVED: '#8b5cf6',
  STARTED: '#06b6d4',
  COMPLETED: '#16a34a',
  CANCELLED: '#6b7280',
};

export default function StatusBadge({ status }) {
  const color = COLORS[status] || '#6b7280';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'white',
        background: color,
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
