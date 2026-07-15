import { usePersons } from "../hooks/usePersons";
import { NO_PERSON } from "../lib/transactionActions";

export function PersonSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const { persons } = usePersons();

  return (
    <div>
      <label className="label">الشخص (اختياري)</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={NO_PERSON}>بدون شخص</option>
        {persons.map((p) => (
          <option key={p.id} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
