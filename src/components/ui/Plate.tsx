export function Plate({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`reda-plate ${className}`}>
      <img src={src} alt={alt} />
    </figure>
  );
}

export function WallLabel({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="reda-walllabel">
      <div className="reda-walllabel__title">{title}</div>
      <div className="reda-walllabel__meta">
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
