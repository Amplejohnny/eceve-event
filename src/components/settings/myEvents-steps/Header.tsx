interface HeaderProps {
  tab: "myBookings" | "myEvents";
  setTab: (tab: "myBookings" | "myEvents") => void;
  userRole: "VISITOR" | "USER" | "ORGANIZER" | "ADMIN";
}

export default function Header({ tab, setTab, userRole }: HeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">History</h1>
        <p className="text-gray-600 mt-1">
          {tab === "myBookings"
            ? "Manage your event bookings and tickets"
            : "Manage your events and track performance"}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Account: {userRole.toLowerCase().replace("_", " ")}
        </p>
      </div>
      <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
        <button
          onClick={() => setTab("myBookings")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "myBookings"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          My Bookings
        </button>
        {(userRole === "ORGANIZER" || userRole === "ADMIN") && (
          <button
            onClick={() => setTab("myEvents")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "myEvents"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            My Events
          </button>
        )}
      </div>
    </div>
  );
}
