"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Property = {
  id: string;
  title: string;
  address: string | null;
  price: number | null;
  status: "draft" | "published";
  created_at: string;
  owner_id: string | null;
};

export default function PropertiesPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [msg, setMsg] = useState("");

  // 1) Guard + get user
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;

      if (!uid) {
        router.replace("/auth/sign-in");
        return;
      }
      if (!active) return;
      setUserId(uid);
    })();
    return () => { active = false; };
  }, [router, supabase]);

  // 2) Load my properties once userId is known
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      setLoading(true);
      setMsg("");
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("owner_id", userId)          // only my rows
        .order("created_at", { ascending: false });

      if (!active) return;
      setLoading(false);
      if (error) {
        setMsg(error.message || "Failed to load properties");
        return;
      }
      setItems(data ?? []);
    })();
    return () => { active = false; };
  }, [userId, supabase]);

  async function createProperty(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!userId) {
      router.replace("/auth/sign-in");
      return;
    }

    const numericPrice = price ? Number(price) : null;
    if (numericPrice !== null && Number.isNaN(numericPrice)) {
      setMsg("Price must be numeric");
      return;
    }

    // Insert with owner_id = current user
    const { data, error } = await supabase
      .from("properties")
      .insert([
        {
          title: title.trim(),
          address: address.trim(),
          price: numericPrice,
          status,
          owner_id: userId,
        },
      ])
      .select("*")
      .single();

    if (error) {
      setMsg(error.message || "Failed to create property");
      return;
    }

    // clear + prepend
    setTitle("");
    setAddress("");
    setPrice("");
    setStatus("draft");
    setItems((prev) => [data as Property, ...prev]);
    setMsg("Property created.");
    setTimeout(() => setMsg(""), 2500);
  }

  if (!userId) {
    // While we check session we can show nothing/loader
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-24">
      <h1 className="text-2xl font-bold">My Properties</h1>
      <p className="text-gray-600 mt-2">
        Create a property (draft/published). Rows are scoped to your account by RLS.
      </p>

      {/* Create form */}
      <form onSubmit={createProperty} className="mt-8 grid gap-4 sm:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (required)"
          className="border rounded-lg p-3"
          required
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="border rounded-lg p-3"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (e.g., 850000)"
          className="border rounded-lg p-3"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          className="border rounded-lg p-3"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        <button
          type="submit"
          className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-3 font-medium"
        >
          Create Property
        </button>
      </form>

      {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}

      {/* List */}
      <div className="mt-10 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 border-b">Title</th>
              <th className="p-3 border-b">Address</th>
              <th className="p-3 border-b">Price</th>
              <th className="p-3 border-b">Status</th>
              <th className="p-3 border-b">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3" colSpan={5}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td className="p-3" colSpan={5}>No properties yet.</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="odd:bg-white even:bg-gray-50">
                  <td className="p-3 border-b">{p.title}</td>
                  <td className="p-3 border-b">{p.address || "—"}</td>
                  <td className="p-3 border-b">
                    {p.price !== null ? `$${Number(p.price).toLocaleString()}` : "—"}
                  </td>
                  <td className="p-3 border-b">{p.status}</td>
                  <td className="p-3 border-b">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}