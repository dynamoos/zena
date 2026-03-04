import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/atoms/button';

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  const pageNumbers: number[] = [];
  const from = Math.max(0, page - 2);
  const to = Math.min(totalPages - 1, page + 2);
  for (let i = from; i <= to; i += 1) pageNumbers.push(i);

  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-muted">
        Mostrando <span className="font-medium text-text">{start}</span>-
        <span className="font-medium text-text">{end}</span> de{' '}
        <span className="font-medium text-text">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="px-2.5"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageNumbers.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={p === page ? 'primary' : 'outline'}
            onClick={() => onPageChange(p)}
            className="min-w-9 px-2.5"
          >
            {p + 1}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="px-2.5"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { TablePagination };
export type { TablePaginationProps };
