import { useContext } from 'react';
import { PresenceContext } from '@/hooks/presenceContext';

export function usePresence() {
  return useContext(PresenceContext);
}

export default usePresence;
