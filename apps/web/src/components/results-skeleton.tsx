export function ResultsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <span className="sr-only">Mencari laptop yang cocok...</span>
      <div className="skeleton h-8 w-2/3 max-w-md" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card grid gap-6 p-6 lg:grid-cols-[1fr_16rem]" aria-hidden="true">
          <div className="space-y-3">
            <div className="skeleton h-7 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-7 w-40 rounded-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
          <div className="skeleton h-44 w-full" />
        </div>
      ))}
    </div>
  );
}
