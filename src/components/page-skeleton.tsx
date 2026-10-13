type SkeletonVariant = "home" | "platforms" | "games" | "platform" | "wantlist" | "sell" | "detail" | "search";

function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded-xl bg-slate-200 ${className}`} />;
}

function CardGrid({ count, className = "" }: { count: number; className?: string }) {
  return <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>{Array.from({ length: count }, (_, index) => <Block key={index} className="h-36 rounded-2xl border border-slate-200" />)}</div>;
}

export function PageSkeleton({ variant }: { variant: SkeletonVariant }) {
  return <div aria-busy="true" className="animate-pulse space-y-5">
    <p role="status" className="sr-only">A carregar conteúdo da página</p>
    {variant === "home" && <>
      <div className="flex items-center justify-between gap-3"><div className="space-y-2"><Block className="h-3 w-32" /><Block className="h-8 w-32" /></div><Block className="h-10 w-28" /></div>
      <Block className="h-12 rounded-xl md:hidden" />
      <Block className="h-36 rounded-2xl border border-slate-200" />
      <div className="space-y-3"><Block className="h-5 w-32" /><div className="grid gap-3 lg:grid-cols-2"><Block className="h-44 rounded-2xl" /><Block className="h-44 rounded-2xl" /></div></div>
      <Block className="h-36 rounded-2xl" />
      <Block className="h-5 w-28" /><CardGrid count={4} />
    </>}
    {variant === "platforms" && <><div className="flex items-end justify-between"><div className="space-y-2"><Block className="h-3 w-24" /><Block className="h-8 w-64" /><Block className="h-4 w-52" /></div><Block className="h-10 w-32" /></div><Block className="h-24 rounded-2xl" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Block key={i} className="h-28 rounded-2xl" />)}</div></>}
    {variant === "games" && <><div className="space-y-2"><Block className="h-3 w-28" /><Block className="h-8 w-56" /><Block className="h-4 w-64" /></div><div className="flex flex-col gap-2 sm:flex-row"><Block className="h-11 flex-1" /><Block className="h-11 w-32" /><Block className="h-11 w-28" /></div><CardGrid count={8} /></>}
    {variant === "platform" && <><Block className="h-4 w-32" /><section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><Block className="h-24 w-24 shrink-0" /><div className="flex-1 space-y-2"><Block className="h-3 w-24" /><Block className="h-8 w-56" /><Block className="h-4 w-44" /></div></section><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Block key={i} className="h-20" />)}</div><div className="flex gap-2"><Block className="h-11 flex-1" /><Block className="h-11 w-32" /><Block className="h-11 w-28" /></div><CardGrid count={6} /></>}
    {variant === "wantlist" && <><div className="space-y-2"><Block className="h-3 w-28" /><Block className="h-8 w-40" /><Block className="h-4 w-64" /></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Block key={i} className="h-16" />)}</div><div className="flex gap-2"><Block className="h-11 flex-1" /><Block className="h-11 w-32" /><Block className="h-11 w-24" /></div><div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">{Array.from({ length: 5 }, (_, i) => <Block key={i} className="h-20" />)}</div></>}
    {variant === "sell" && <><div className="flex gap-2"><Block className="h-10 w-28" /><Block className="h-10 w-24" /></div><div className="flex gap-2"><Block className="h-11 flex-1" /><Block className="h-11 w-32" /><Block className="h-11 w-28" /></div><CardGrid count={6} /></>}
    {variant === "detail" && <><Block className="h-4 w-32" /><section className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"><Block className="h-32 w-24 shrink-0 sm:h-40 sm:w-28" /><div className="flex-1 space-y-3"><Block className="h-4 w-24" /><Block className="h-8 w-3/4" /><Block className="h-5 w-1/2" /></div></section><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Block key={i} className="h-24" />)}</div><Block className="h-16 rounded-2xl" /><Block className="h-40 rounded-2xl" /><Block className="h-40 rounded-2xl" /></>}
    {variant === "search" && <><Block className="h-4 w-32" /><div className="space-y-2"><Block className="h-3 w-28" /><Block className="h-8 w-72" /><Block className="h-4 w-28" /></div><div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2">{Array.from({ length: 7 }, (_, i) => <Block key={i} className="h-16" />)}</div></>}
  </div>;
}
