/** Миттєвий скелетон при переході між сторінками — сторінка "відчувається" швидкою */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-56 rounded-lg bg-neutral-200"></div>
      <div className="h-40 rounded-xl border border-neutral-200 bg-neutral-100"></div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-32 rounded-xl border border-neutral-200 bg-neutral-100"></div>
        <div className="h-32 rounded-xl border border-neutral-200 bg-neutral-100"></div>
        <div className="h-32 rounded-xl border border-neutral-200 bg-neutral-100"></div>
      </div>
      <div className="h-64 rounded-xl border border-neutral-200 bg-neutral-100"></div>
    </div>
  );
}
