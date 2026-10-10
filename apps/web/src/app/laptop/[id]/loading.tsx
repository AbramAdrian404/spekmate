export default function Loading() {
  return (
    <div className="container-page py-10" role="status" aria-live="polite">
      <span className="sr-only">Memuat detail laptop...</span>
      <div className="skeleton mb-4 h-10 w-80 max-w-full" aria-hidden="true" />
      <div className="skeleton mb-8 h-5 w-96 max-w-full" aria-hidden="true" />
      <div className="card space-y-4 p-7" aria-hidden="true">
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-40 w-full" />
      </div>
    </div>
  );
}
