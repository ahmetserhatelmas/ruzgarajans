export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-80 animate-pulse rounded-md bg-muted" />
      <div className="mt-6 space-y-2">
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
