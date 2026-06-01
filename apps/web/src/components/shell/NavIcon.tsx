import {
  Building2,
  CircleGauge,
  Database,
  FileText,
  Gem,
  LayoutDashboard,
  MapPinned,
  Settings2,
  Shield,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavIcon } from '@/lib/nav-config';

const icons = {
  dashboard: LayoutDashboard,
  khanan: Database,
  crm: Users,
  consigner: Building2,
  consignee: Shield,
  district: MapPinned,
  mineral: Gem,
  chalaan: FileText,
  vehicle: Truck,
  status: CircleGauge,
  config: Settings2,
} satisfies Record<NavIcon, LucideIcon>;

export function NavIconView({ icon, className }: { icon?: NavIcon; className?: string }) {
  const Icon = icons[icon ?? 'dashboard'];
  return <Icon className={className ?? 'h-4 w-4'} aria-hidden />;
}
