import { AppNavigation } from '@/components/AppNavigation';
import { Outlet } from 'react-router-dom';

export function Layout({ children }) {
  return <AppNavigation>{children}</AppNavigation>;
}
