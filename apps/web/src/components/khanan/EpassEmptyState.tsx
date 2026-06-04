import {
  EmptyStateLayout,
  type EmptyStateAction,
  type EmptyStateIcon,
} from '@/components/khanan/EmptyStateLayout';

interface Props {
  message: string;
  icon?: EmptyStateIcon;
  actions?: EmptyStateAction[];
  className?: string;
}

export function EpassEmptyState({ message, icon, actions, className }: Props) {
  return (
    <EmptyStateLayout
      message={message}
      icon={icon}
      actions={actions}
      size="browse"
      className={className}
    />
  );
}
