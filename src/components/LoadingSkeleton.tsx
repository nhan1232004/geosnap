export function TimelineSkeleton() {
  return (
    <div className="p-10 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <div className="h-8 w-64 bg-surface rounded-lg animate-pulse mb-4" />
          <div className="flex gap-6">
            <div className="h-4 w-40 bg-surface rounded-lg animate-pulse" />
            <div className="h-4 w-40 bg-surface rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-10 w-32 bg-brand/20 rounded-full animate-pulse" />
      </div>

      <div className="space-y-12">
        {[1, 2].map((month) => (
          <div key={month}>
            <div className="h-4 w-32 bg-surface rounded-lg animate-pulse mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((card) => (
                <div key={card} className="h-[240px] bg-surface rounded-[20px] border border-border-dim animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="h-full w-full relative bg-surface">
      <div className="absolute top-8 left-8 z-[400] w-72 h-64 bg-surface/80 backdrop-blur-md border border-border-dim rounded-3xl animate-pulse" />
    </div>
  );
}
