import { Button } from './Button';

/**
 * EmptyState — shown when a list/module has no content.
 * Never shows a blank screen.
 *
 * icon: lucide component
 * title: Hebrew string
 * description: Hebrew string (optional)
 * action: { label, onClick, icon } — optional primary CTA
 * compact: one-line version for empty sections inside a card
 */
export function EmptyState({ icon: Icon, title, description, action, compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-5 py-5 ${className}`}>
        {Icon && <Icon size={22} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-body font-semibold text-text-secondary">{title}</p>
          {description && <p className="text-meta text-text-tertiary">{description}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-16 px-6 text-center ${className}`}>
      {Icon && (
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Icon size={36} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <p className="text-h3 text-text-secondary">{title}</p>
        {description && (
          <p className="text-body text-text-tertiary max-w-xs">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant="secondary"
          icon={action.icon}
          onClick={action.onClick}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
