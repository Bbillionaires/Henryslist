import { Input, Select, Textarea, Label, FieldError } from "@/components/ui/input";

export interface CategoryFieldDTO {
  id: string;
  key: string;
  label: string;
  type: "TEXT" | "TEXTAREA" | "NUMBER" | "SELECT" | "MULTISELECT" | "BOOLEAN" | "DATE";
  required: boolean;
  options: string[] | null;
  unit: string | null;
}

export type AttributeValue = string | number | boolean | string[];

export function DynamicField({
  field,
  value,
  onChange,
  error,
}: {
  field: CategoryFieldDTO;
  value: AttributeValue | undefined;
  onChange: (value: AttributeValue) => void;
  error?: string;
}) {
  const id = `field-${field.key}`;

  return (
    <div>
      <Label htmlFor={id} required={field.required}>
        {field.label}
        {field.unit && <span className="font-normal text-slate-400"> ({field.unit})</span>}
      </Label>

      {field.type === "TEXT" && <Input id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />}

      {field.type === "TEXTAREA" && <Textarea id={id} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />}

      {field.type === "NUMBER" && (
        <Input id={id} type="number" value={(value as number) ?? ""} onChange={(e) => onChange(e.target.valueAsNumber || 0)} />
      )}

      {field.type === "DATE" && <Input id={id} type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />}

      {field.type === "SELECT" && (
        <Select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      )}

      {field.type === "MULTISELECT" && (
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const selected = Array.isArray(value) && value.includes(o);
            return (
              <button
                type="button"
                key={o}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange(selected ? current.filter((v) => v !== o) : [...current, o]);
                }}
                className={`rounded-full border px-3 py-1 text-sm ${
                  selected ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {field.type === "BOOLEAN" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Yes
        </label>
      )}

      <FieldError>{error}</FieldError>
    </div>
  );
}
