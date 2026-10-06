import { withExistingOption, type SelectOption } from "@/lib/collection-field-options";

export function CollectionSelectField({
  name,
  label,
  options,
  defaultValue = "",
  placeholder = "Por definir",
  required = false,
}: {
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
}) {
  const value = String(defaultValue ?? "");
  const available = withExistingOption(options, value);
  return <label>
    <span className="field-label">{label}</span>
    <select name={name} defaultValue={value} required={required} className="field-input">
      {!required && <option value="">{placeholder}</option>}
      {available.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
