export default function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  // Génère la liste des numéros à afficher (avec "…" si nécessaire)
  function getPages() {
    const pages = [];
    const delta = 2; // pages autour de la page courante

    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    pages.push(1);
    if (left > 2) pages.push("…left");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("…right");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        ‹
      </button>

      {getPages().map((p, i) =>
        typeof p === "string" ? (
          <span key={p} className="pagination-ellipsis">…</span>
        ) : (
          <button
            key={p}
            className={`pagination-btn${p === page ? " active" : ""}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}

      <button
        className="pagination-btn"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        ›
      </button>
    </div>
  );
}
