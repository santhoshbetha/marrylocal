import { SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const DISCOVERY_SORT_OPTIONS = [
  { value: 'distance', label: 'Sort by Distance' },
  { value: 'age', label: 'Sort by Age' },
  { value: 'last_active', label: 'Sort by Last Active' },
];

export function DiscoverySortSelect({
  value = 'last_active',
  onChange,
  disabled = false,
  className = '',
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          data-testid="discovery-sort-trigger"
          className="h-10 w-full min-w-[190px] rounded-xl border-border/60 bg-card text-sm font-semibold text-foreground"
        >
          <SelectValue placeholder="Sort profiles" />
        </SelectTrigger>
        <SelectContent>
          {DISCOVERY_SORT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default DiscoverySortSelect;
