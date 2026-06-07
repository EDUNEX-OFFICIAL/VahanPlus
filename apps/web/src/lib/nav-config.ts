export interface NavLink {
  type: 'link';
  label: string;
  href: string;
  icon?: NavIcon;
}

export interface NavGroup {
  type: 'group';
  label: string;
  prefix?: string;
  icon?: NavIcon;
  children: { label: string; href: string; icon?: NavIcon }[];
}

export type NavItem = NavLink | NavGroup;
export type NavIcon =
  | 'dashboard'
  | 'khanan'
  | 'crm'
  | 'consigner'
  | 'consignee'
  | 'district'
  | 'mineral'
  | 'challan'
  | 'vehicle'
  | 'status'
  | 'config'
  | 'import';

export const navItems: NavItem[] = [
  { type: 'link', label: 'Dashboard', href: '/', icon: 'dashboard' },
  {
    type: 'group',
    label: 'KhananSoft',
    prefix: '/khanan',
    icon: 'khanan',
    children: [
      { label: 'Consigner Data', href: '/khanan/consigner', icon: 'consigner' },
      { label: 'Consignee Data', href: '/khanan/consignee', icon: 'consignee' },
      { label: 'District', href: '/khanan/district', icon: 'district' },
      { label: 'Mineral', href: '/khanan/mineral', icon: 'mineral' },
      { label: 'Challan', href: '/khanan/challan', icon: 'challan' },
      { label: 'Vehicle Data', href: '/khanan/vehicle-data', icon: 'vehicle' },
      { label: 'Vehicle Status', href: '/khanan/vehicle-status', icon: 'status' },
      { label: 'Import Data', href: '/khanan/import', icon: 'import' },
      { label: 'Khanan Config', href: '/khanan/config', icon: 'config' },
    ],
  },
  {
    type: 'group',
    label: 'CRM',
    prefix: '/crm',
    icon: 'crm',
    children: [
      { label: 'Vehicle Expiry', href: '/crm/vehicle-expiry', icon: 'status' },
      { label: 'CRM Config', href: '/crm/config', icon: 'config' },
    ],
  },
];

export const quickNavItems = [
  { label: 'Home', href: '/', icon: 'dashboard' as const },
  { label: 'Consigner', href: '/khanan/consigner', icon: 'consigner' as const },
  { label: 'Challan', href: '/khanan/challan', icon: 'challan' as const },
  { label: 'Status', href: '/khanan/vehicle-status', icon: 'status' as const },
];

function findChildTitle(pathname: string): string | null {
  for (const item of navItems) {
    if (item.type !== 'group') continue;
    const child = item.children.find((c) => c.href === pathname);
    if (child) return child.label;
  }
  return null;
}

export function getPageEyebrow(pathname: string): string {
  if (pathname === '/') return 'Overview';
  if (pathname.startsWith('/khanan')) return 'KhananSoft';
  if (pathname.startsWith('/crm')) return 'CRM';
  return 'Overview';
}

export function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/khanan/consigner/') && pathname.endsWith('/challans')) {
    return 'Consignee Data';
  }
  const childTitle = findChildTitle(pathname);
  if (childTitle) return childTitle;
  return 'Dashboard';
}

export function isPathAllowed(pathname: string): boolean {
  if (pathname === '/') return true;
  if (pathname.startsWith('/khanan/')) return true;
  if (pathname.startsWith('/crm/')) return true;
  return false;
}
