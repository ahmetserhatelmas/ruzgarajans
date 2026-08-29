export function BrandedVideo({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-black ${className}`}>
      <video src={src} controls className="w-full" />
      <img
        src="/brand-logo.png"
        alt=""
        className="pointer-events-none absolute right-2 bottom-2 h-11 w-11 rounded-md object-cover opacity-90 ring-1 ring-white/25 shadow-md"
      />
    </div>
  );
}
