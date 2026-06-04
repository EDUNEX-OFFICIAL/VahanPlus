import { EmptyStateLayout, type EmptyStateIcon } from '@/components/khanan/EmptyStateLayout';

interface EmptyStateCardProps {
  message: string;
  icon?: EmptyStateIcon;
  className?: string;
}

export function EmptyStateCard({ message, icon = 'inbox', className }: EmptyStateCardProps) {
  return <EmptyStateLayout message={message} icon={icon} size="compact" className={className} />;
}
