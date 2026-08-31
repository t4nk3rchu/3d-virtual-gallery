export function StatusBar({
  roomName,
  workCount,
  mode,
  saved,
}: {
  roomName: string;
  workCount: number;
  mode: string;
  saved: string;
}) {
  return (
    <div className="wb-status">
      <div className="g">
        <span>{roomName}</span>
        <span>·</span>
        <span>{workCount} works</span>
      </div>
      <div className="g">
        <span>
          Mode <b>{mode}</b>
        </span>
        <span>
          <b style={{ color: 'var(--reda-sage)' }}>{saved}</b>
        </span>
      </div>
    </div>
  );
}
