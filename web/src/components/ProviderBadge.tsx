import type { ProviderId } from '../lib/providers';
import { PROVIDER_COLORS, PROVIDER_NAMES } from '../lib/providers';

interface ProviderBadgeProps {
  provider: ProviderId;
}

/** Colored dot + provider name badge. */
export function ProviderBadge({ provider }: ProviderBadgeProps) {
  const color = PROVIDER_COLORS[provider].light;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {PROVIDER_NAMES[provider]}
    </span>
  );
}
