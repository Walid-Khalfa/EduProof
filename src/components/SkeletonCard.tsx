import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image placeholder */}
        <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        
        {/* Details */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        
        {/* Score */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2">
          <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-9 flex-1 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
}
