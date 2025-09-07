export const DividerHandle = ({
  onSplitPointerDown,
  isSplitLocked,
}: {
  onSplitPointerDown: (e: React.PointerEvent) => void;
  isSplitLocked: boolean;
}) => {
  return (
    <div
      data-divider-handle
      onPointerDown={onSplitPointerDown}
      style={{
        width: 10,
        cursor: isSplitLocked ? "not-allowed" : "col-resize",
        flex: "0 0 auto",
        alignSelf: "stretch",
        background: "transparent",
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      aria-label="Resize preview/inspector"
    >
      <div
        style={{
          width: 10,
          height: 64,
          borderRadius: 8,
          background: "rgba(0,0,0,0.08)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
            }}
          />
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: isSplitLocked ? "rgba(120,120,120,0.5)" : "rgba(180,180,180,0.9)",
            }}
          />
        </div>
      </div>
      <style jsx>{`
        [data-divider-handle] {
          display: none;
        }
        @media (min-width: 1280px) {
          [data-divider-handle] {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
};
