export type PaginationItem = number | "ellipsis";

export function getPageCount(itemCount: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 0;
  }

  return Math.ceil(Math.max(0, itemCount) / pageSize);
}

export function getPageItems<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) {
    return [];
  }

  const safePage = Math.max(1, Math.floor(page));
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function getPaginationItems(currentPage: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 0) {
    return [];
  }

  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const safeCurrentPage = Math.min(pageCount, Math.max(1, Math.floor(currentPage)));
  const visiblePages = new Set([1, pageCount, safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1]);
  const pages = [...visiblePages].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  const result: PaginationItem[] = [];

  for (const page of pages) {
    const previous = result[result.length - 1];

    if (typeof previous === "number" && page - previous > 1) {
      result.push("ellipsis");
    }

    result.push(page);
  }

  return result;
}
