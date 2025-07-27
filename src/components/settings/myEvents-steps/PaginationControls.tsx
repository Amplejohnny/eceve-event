interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface PaginationControlsProps {
  pagination: Pagination;
  setPagination: (pagination: Pagination) => void;
}

export default function PaginationControls({
  pagination,
  setPagination,
}: PaginationControlsProps): React.JSX.Element {
  const handlePaginationChange = (newOffset: number): void => {
    setPagination({ ...pagination, offset: newOffset });
  };

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
      <button
        aria-label="Previous Page"
        onClick={() => {
          const newOffset = Math.max(0, pagination.offset - pagination.limit);
          handlePaginationChange(newOffset);
        }}
        disabled={pagination.offset === 0}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-700">
          Page {Math.floor(pagination.offset / pagination.limit) + 1} of{" "}
          {Math.ceil(pagination.total / pagination.limit)}
        </span>
        <span className="text-xs text-gray-500 hidden sm:inline">
          ({pagination.offset + 1} -{" "}
          {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
          {pagination.total})
        </span>
      </div>
      <button
        aria-label="Next Page"
        onClick={() => {
          const newOffset = pagination.offset + pagination.limit;
          handlePaginationChange(newOffset);
        }}
        disabled={!pagination.hasMore}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );
}
