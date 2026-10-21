export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
      <span className="sr-only">{label}</span>
      <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
