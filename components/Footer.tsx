
export default function Footer() {
  return (
    <footer className="bg-gray-50 mt-10 border-t">
      <div className="max-w-6xl mx-auto p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} VendorHub. All rights reserved.
      </div>
    </footer>
  );
}
