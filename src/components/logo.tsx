import { Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Home className="h-6 w-6 text-primary" />
      <span className="font-headline text-xl font-bold">Nestify</span>
    </div>
  );
}
