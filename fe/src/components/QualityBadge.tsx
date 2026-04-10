import { Award, Star } from 'lucide-react';
import { Badge } from './ui/badge';

interface QualityBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function QualityBadge({ score, size = 'md' }: QualityBadgeProps) {
  // Map score to a color, but remove textual labels (no 'Poor'/'Excellent')
  const colorFor = (s: number) => {
    if (s >= 90) return 'bg-green-500';
    if (s >= 80) return 'bg-blue-500';
    if (s >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1' : size === 'lg' ? 'px-4 py-2' : 'px-3 py-1.5';

  const color = colorFor(score);

  return (
    <Badge className={`${color} text-white ${padding} ${textSize} flex items-center gap-1.5`}>
      <Award className={iconSize} />
      <span className="font-medium">{score}%</span>
    </Badge>
  );
}
