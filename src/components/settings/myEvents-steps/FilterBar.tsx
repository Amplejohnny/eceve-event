interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface FilterBarProps {
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  sortBy: "date";
  setSortBy: (sort: "date") => void;
  tab: "myBookings" | "myEvents";
  pagination: Pagination;
}

export default function FilterBar({
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  tab,
  pagination,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex gap-2">
        <select
          title="Filter by Status"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          {tab === "myBookings" && <option value="refunded">Refunded</option>}
          {tab === "myEvents" && (
            <>
              <option value="draft">Draft</option>
              <option value="suspended">Suspended</option>
            </>
          )}
        </select>
        <select
          title="Sort by Date"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "date")}
        >
          <option value="date">Sort by Date</option>
        </select>
      </div>
      <div className="flex items-center text-sm text-gray-600">
        Showing {pagination.offset + 1} -{" "}
        {Math.min(pagination.offset + pagination.limit, pagination.total)} of{" "}
        {pagination.total} results
      </div>
    </div>
  );
}
