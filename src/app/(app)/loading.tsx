export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-52 rounded-lg bg-slate-200" />
      <div className="h-12 rounded-2xl bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-56 rounded-[1.6rem] bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
