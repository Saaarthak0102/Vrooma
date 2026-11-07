export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-16" aria-busy="true">
      <div className="h-64 animate-pulse rounded-2xl bg-[var(--bg-sheen)]" />
    </main>
  );
}
