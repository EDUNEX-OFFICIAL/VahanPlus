export function AmbientBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="animate-blob-drift absolute -left-32 top-0 h-[420px] w-[420px] rounded-full opacity-[0.12] blur-[120px]"
        style={{ background: 'var(--blob-indigo)' }}
      />
      <div
        className="animate-blob-drift absolute -right-24 top-20 h-[360px] w-[360px] rounded-full opacity-[0.08] blur-[100px]"
        style={{ background: 'var(--blob-rose)', animationDelay: '2s' }}
      />
      <div
        className="animate-blob-drift absolute -bottom-32 right-0 h-[520px] w-[520px] rounded-full opacity-[0.1] blur-[120px]"
        style={{ background: 'var(--blob-teal)', animationDelay: '4s' }}
      />
      <div
        className="animate-blob-drift absolute bottom-10 left-20 h-[400px] w-[400px] rounded-full opacity-[0.08] blur-[100px]"
        style={{ background: 'var(--blob-amber)', animationDelay: '6s' }}
      />
    </div>
  );
}
