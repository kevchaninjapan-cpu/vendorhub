// app/layout.tsx


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}