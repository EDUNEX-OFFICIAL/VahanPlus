import { Card } from '@/components/ui/Card';

interface EmptyStateCardProps {
  message: string;
  className?: string;
}

export function EmptyStateCard({ message, className }: EmptyStateCardProps) {
  return (
    <Card className={className}>
      <p className="text-sm text-text-secondary">{message}</p>
    </Card>
  );
}
