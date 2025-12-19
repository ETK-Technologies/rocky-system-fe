export default function TextInput({ id, type, label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        type={type}
        required
        value={value || ""}
        onChange={(e) => onChange(id, e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
      />
    </div>
  );
}
