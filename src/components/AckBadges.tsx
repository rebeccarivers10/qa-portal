import { CheckCircle, Circle } from "lucide-react";

interface Props {
  acknowledgedAt: Date | string | null;
  managerAcknowledgedAt: Date | string | null;
}

export function AckBadges({ acknowledgedAt, managerAcknowledgedAt }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        acknowledgedAt ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
      }`}>
        {acknowledgedAt
          ? <CheckCircle className="w-3 h-3" />
          : <Circle className="w-3 h-3" />}
        User
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        managerAcknowledgedAt ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"
      }`}>
        {managerAcknowledgedAt
          ? <CheckCircle className="w-3 h-3" />
          : <Circle className="w-3 h-3" />}
        Manager
      </span>
    </div>
  );
}
