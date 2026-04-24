"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RichTextEditor, {
  SafeDescriptionHtml,
} from "@/components/common/RichTextEditor";
import {
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Info,
  Lightbulb,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Category {
  id: number;
  assessment_type_id: number;
  name: string;
  description: string | null;
  display_order: number;
}
interface AssessmentType {
  id: number;
  name: string;
}

type FormState = {
  assessment_type_id: number | "";
  name: string;
  description: string;
  display_order: number;
};

const blank = (typeId: number | "" = ""): FormState => ({
  assessment_type_id: typeId,
  name: "",
  description: "",
  display_order: 0,
});

function stripHtml(html?: string | null, max = 120) {
  if (!html) return "";
  const txt = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return txt.length > max ? txt.slice(0, max) + "…" : txt;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [types, setTypes] = useState<AssessmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filterType, setFilterType] = useState<string>("");

  const load = async () => {
    setLoading(true);
    try {
      const [catRes, typeRes] = await Promise.all([
        fetch(
          `${API}/admin/categories${filterType ? `?assessment_type_id=${filterType}` : ""}`,
          { credentials: "include" },
        ),
        fetch(`${API}/admin/assessment-types`, { credentials: "include" }),
      ]);
      const [catData, typeData] = await Promise.all([
        catRes.json(),
        typeRes.json(),
      ]);
      if (catData.success) setCategories(catData.categories);
      if (typeData.success) setTypes(typeData.assessmentTypes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filterType]);

  const openNew = () => {
    setForm(blank(types[0]?.id || ""));
    setEditingId(null);
    setError("");
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setForm({
      assessment_type_id: c.assessment_type_id,
      name: c.name,
      description: c.description || "",
      display_order: c.display_order,
    });
    setEditingId(c.id);
    setError("");
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setError("");
  };

  const save = async () => {
    if (!form.assessment_type_id) {
      setError("Please select an assessment type");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const isNew = editingId === null;
      const url = isNew
        ? `${API}/admin/categories`
        : `${API}/admin/categories/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Save failed");
        return;
      }
      await load();
      closeModal();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const del = async (c: Category) => {
    if (!confirm(`Delete "${c.name}" and all its questions?`)) return;
    const res = await fetch(`${API}/admin/categories/${c.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!data.success) {
      alert(data.error || "Delete failed");
      return;
    }
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
  };

  const typeName = (id: number) => types.find((t) => t.id === id)?.name || "—";
  const total = useMemo(() => categories.length, [categories]);

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <Card className="w-full rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <FolderOpen className="h-6 w-6 text-primary" />
                Categories
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Total Categories:{" "}
                <span className="font-semibold text-primary">{total}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterType || "all"}
                onValueChange={(v) => setFilterType(v === "all" ? "" : v)}
              >
                <SelectTrigger className="h-10 w-52">
                  <SelectValue placeholder="All assessment types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assessment types</SelectItem>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={openNew}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:shadow-lg hover:from-[#5c72d8] hover:to-[#6a4391]"
                size="lg"
                disabled={types.length === 0}
              >
                <Plus className="h-4 w-4" />
                Create New Category
              </Button>
            </div>
          </div>

          <div className="my-5 h-px bg-slate-200" />

          {/* Table */}
          {loading ? (
            <TableSkeleton columns={5} rows={6} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-primary/80">
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Assessment Type</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3 text-center">Order</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4 font-semibold text-primary">
                        #{c.id}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <Layers className="h-3 w-3" />
                          {typeName(c.assessment_type_id)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {c.name}
                        </div>
                        {c.description && (
                          <div className="mt-0.5 line-clamp-2 max-w-lg text-xs text-slate-500">
                            {stripHtml(c.description)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                          {c.display_order}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openEdit(c)}
                            className="h-8 bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => del(c)}
                            className="h-8 bg-rose-500 hover:bg-rose-600 text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-16 text-center text-slate-400"
                      >
                        No categories yet.{" "}
                        {types.length === 0
                          ? "Create an assessment type first."
                          : 'Click "Create New Category" to add one.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId === null ? "Add Category" : "Edit Category"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>
                  Assessment Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={
                    form.assessment_type_id
                      ? String(form.assessment_type_id)
                      : ""
                  }
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      assessment_type_id: Number(v) || "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Assessment Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5 text-slate-400" />
                  Select which assessment type this category belongs to
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Category Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., Employee Engagement"
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                  placeholder="Describe this category…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      display_order: Number(e.target.value) || 0,
                    }))
                  }
                />
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Lower numbers appear first
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <Button variant="ghost" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:from-[#5c72d8] hover:to-[#6a4391]"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId === null ? "Create" : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
