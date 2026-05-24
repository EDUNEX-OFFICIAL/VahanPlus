export interface NavLink {
  type: 'link';
  label: string;
  href: string;
}

export interface NavGroup {
  type: 'group';
  label: string;
  prefix?: string;
  children: { label: string; href: string }[];
}

export type NavItem = NavLink | NavGroup;

export const navItems: NavItem[] = [
  { type: 'link', label: 'Dashboard', href: '/' },
  {
    type: 'group',
    label: 'KhananSoft',
    prefix: '/khanan',
    children: [
      { label: 'Consigner Data', href: '/khanan/consigner' },
      { label: 'Consignee Data', href: '/khanan/consignee' },
      { label: 'District', href: '/khanan/district' },
      { label: 'Mineral', href: '/khanan/mineral' },
      { label: 'Chalaan', href: '/khanan/chalaan' },
      { label: 'Vehicle Data', href: '/khanan/vehicle-data' },
      { label: 'Vehicle Status', href: '/khanan/vehicle-status' },
      { label: 'Khanan Config', href: '/khanan/config' },
    ],
  },
  {
    type: 'group',
    label: 'CRM',
    prefix: '/crm',
    children: [],
  },
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
