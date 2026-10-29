export default function Loading() {
  return (
    <div className="container-page py-10" role="status" aria-live="polite">
      <span className="sr-only">Memuat daftar laptop...</span>
      <div className="skeleton mb-8 h-10 w-72" aria-hidden="true" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-3 p-6">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-8 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
