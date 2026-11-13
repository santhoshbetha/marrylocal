import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function hasGovernmentId(user) {
  if (typeof user?.id_verified === 'boolean') return user.id_verified;

  return Boolean(
    user?.verified ||
      user?.aadhaar_verified ||
      user?.aadhar_verified ||
      user?.passport_verified ||
      user?.license_verified,
  );
}

export function VerificationBadges({ user, className }) {
  const peerVerified = Boolean(user?.peer_verified);
  const idVerified = hasGovernmentId(user);

  if (!peerVerified && !idVerified) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {peerVerified ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                data-testid="peer-verified-badge"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Peer Verified
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Verified in-person by 3 local MarryLocal members</p>
            </TooltipContent>
          </Tooltip>
        ) : null}

        {idVerified ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                data-testid="id-verified-badge"
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-400"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                ID Verified
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Government ID verified</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

export default VerificationBadges;
