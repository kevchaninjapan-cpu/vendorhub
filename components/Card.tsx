interface CardProps {
  title: string;
  price: string;
  features: string[];
  highlight?: boolean;
  children?: React.ReactNode;
}

export default function Card({ title, price, features, highlight = false, children }: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-8 flex flex-col ${
        highlight
          ? "border-indigo-600 shadow-xl"
          : "border-gray-200 shadow-sm"
      }`}
    >
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-4 text-4xl font-bold text-gray-900">{price}</p>

      <ul className="mt-6 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="text-gray-700 flex items-center gap-2">
            <span className="text-indigo-600">•</span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">{children}</div>
    </div>
  );
}