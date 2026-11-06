export default function VerifyEmailLoading() {
  return (
    <div className="min-h-[70vh] py-12 px-4 flex items-center justify-center" aria-busy="true">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-card space-y-4">
        <div className="h-14 w-14 rounded-full bg-stone-100 animate-pulse mx-auto" />
        <div className="h-5 w-40 rounded bg-stone-100 animate-pulse mx-auto" />
        <div className="h-11 w-full rounded-pill bg-stone-100 animate-pulse" />
      </div>
    </div>
  );
}
