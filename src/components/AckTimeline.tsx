import { CheckCircle, Circle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  submitterName: string;
  submittedAt: Date | string;
  repName: string;
  acknowledgedAt: Date | string | null;
  managerName: string | null;
  managerAcknowledgedAt: Date | string | null;
}

export function AckTimeline({
  submitterName,
  submittedAt,
  repName,
  acknowledgedAt,
  managerName,
  managerAcknowledgedAt,
}: Props) {
  const steps = [
    {
      label: "Submitted",
      who: submitterName,
      date: submittedAt,
      done: true,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "User Acknowledged",
      who: repName,
      date: acknowledgedAt,
      done: !!acknowledgedAt,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Manager Reviewed",
      who: managerName ?? "Manager",
      date: managerAcknowledgedAt,
      done: !!managerAcknowledgedAt,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Acknowledgment Status</h3>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-start gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-0.5 ${step.done ? step.bg : "bg-gray-100"}`}>
                {step.done
                  ? <CheckCircle className={`w-5 h-5 ${step.color}`} />
                  : <Circle className="w-5 h-5 text-gray-300" />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 h-6 mt-0.5 ${step.done ? "bg-gray-300" : "bg-gray-100"}`} />
              )}
            </div>
            {/* Text */}
            <div className="pb-4">
              <p className={`text-sm font-medium ${step.done ? "text-gray-900" : "text-gray-400"}`}>
                {step.label}
              </p>
              {step.done && step.date ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  {step.who} · {format(new Date(step.date), "MMM d, yyyy 'at' h:mm a")}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">Waiting on {step.who}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
