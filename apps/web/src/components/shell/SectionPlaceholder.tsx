import { Card } from '@/components/ui/Card';

interface SectionPlaceholderProps {
  title: string;
}

export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <div className="animate-slide-right space-y-6">
      <Card className="w-full">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">KhananSoft</p>
        <h2 className="mt-2 text-2xl font-bold text-white">{title}</h2>
      </Card>
    </div>
  );
}
