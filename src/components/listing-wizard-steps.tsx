import { Check } from "lucide-react";
import clsx from "clsx";

const STEPS = ["Category", "Details", "Photos", "Preview", "Payment"];

export function WizardSteps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center justify-between">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const state = step < current ? "done" : step === current ? "active" : "upcoming";
        return (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  state === "done" && "bg-emerald-600 text-white",
                  state === "active" && "bg-slate-900 text-white",
                  state === "upcoming" && "bg-slate-200 text-slate-500",
                )}
              >
                {state === "done" ? <Check size={16} /> : step}
              </div>
              <span className={clsx("text-xs font-medium", state === "upcoming" ? "text-slate-400" : "text-slate-700")}>{label}</span>
            </div>
            {step < STEPS.length && <div className={clsx("mx-2 h-0.5 flex-1", state === "done" ? "bg-emerald-600" : "bg-slate-200")} />}
          </li>
        );
      })}
    </ol>
  );
}
