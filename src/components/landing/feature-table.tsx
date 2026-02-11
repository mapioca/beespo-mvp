"use client";

const tableData = [
  { name: "Bishop Interview", status: "Scheduled", assignee: "Bishop", date: "Feb 15" },
  { name: "Sustaining Vote", status: "Pending", assignee: "Ward Clerk", date: "Feb 16" },
  { name: "Set Apart", status: "Not Started", assignee: "1st Counselor", date: "—" },
];

const statusColors: Record<string, string> = {
  "Scheduled": "bg-green-100 text-green-700",
  "Pending": "bg-yellow-100 text-yellow-700",
  "Not Started": "bg-neutral-100 text-neutral-500",
};

export function FeatureTable() {
  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 rounded-sm bg-white overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500">
          <span>Name</span>
          <span>Status</span>
          <span>Assignee</span>
          <span>Date</span>
        </div>
        {/* Rows */}
        <div className="divide-y divide-neutral-100">
          {tableData.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-4 gap-2 px-3 py-2 text-xs hover:bg-neutral-50 transition-colors"
            >
              <span className="text-neutral-700 truncate">{row.name}</span>
              <span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[row.status]}`}>
                  {row.status}
                </span>
              </span>
              <span className="text-neutral-500 truncate">{row.assignee}</span>
              <span className="text-neutral-400 font-mono">{row.date}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-mono text-center">
        Properties: Status, Assignee, Date
      </p>
    </div>
  );
}
