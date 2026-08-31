type KartvizitField = { label: string; value: string };

type KartvizitPhotos = {
  fullBody: string | null;
  pose: string | null;
  chest: string | null;
  favorite: string | null;
};

function PhotoSlot({ src, className }: { src: string | null; className?: string }) {
  return (
    <div className={className ? `kartvizit-slot ${className}` : "kartvizit-slot"}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : null}
    </div>
  );
}

export function KartvizitCard({
  name,
  fields,
  photos,
}: {
  name: string;
  fields: KartvizitField[];
  photos: KartvizitPhotos;
}) {
  return (
    <article className="kartvizit-sheet">
      <PhotoSlot src={photos.fullBody} className="kartvizit-full" />
      <header className="kartvizit-header">
        <h1 className="kartvizit-name">{name}</h1>
        <div className="kartvizit-logo" aria-hidden>
          <span className="kartvizit-dots">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <strong>RÜZGAR</strong>
          <span>OYUNCULUK &amp; MENAJERLİK</span>
          <span>PRODÜKSİYON</span>
        </div>
      </header>

      <div className="kartvizit-body">
        <dl className="kartvizit-fields">
          {fields.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
        <div className={photos.favorite ? "kartvizit-photos has-favorite" : "kartvizit-photos"}>
          <PhotoSlot src={photos.pose} className="kartvizit-pose" />
          <PhotoSlot src={photos.chest} className="kartvizit-chest" />
          {photos.favorite ? (
            <PhotoSlot src={photos.favorite} className="kartvizit-favorite" />
          ) : null}
        </div>
      </div>
    </article>
  );
}
