import { useState } from "react";
import { toast } from "react-toastify";
import { createMyProspect } from "~/lib/actions/myProspects";
import { DialogButton, DialogTitle } from "~/components/ui/Dialog";
import type { AddProspectFormProps } from "./types";

export function AddProspectForm({
  workspaceId,
  onClose,
  onAdded,
}: AddProspectFormProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const updateField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      setSubmitting(true);
      await createMyProspect(workspaceId, {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        jobTitle: form.jobTitle.trim() || undefined,
        notes: form.notes.trim() || undefined,
        source: "Manual",
      });
      toast.success("Prospect added");
      onAdded();
    } catch (error: any) {
      toast.error(
        error.message === "DUPLICATE"
          ? "A prospect with this email already exists"
          : "Failed to add prospect",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogTitle>
        <span className="i-ph:user-plus w-5 h-5 text-purple-500" />
        Add New Prospect
      </DialogTitle>
      <div className="space-y-3">
        <ProspectField
          label="Full Name *"
          value={form.name}
          onChange={(value) => updateField("name", value)}
          placeholder="e.g. Alex Johnson"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <ProspectField
            label="Company"
            value={form.company}
            onChange={(value) => updateField("company", value)}
            placeholder="Acme Inc."
          />
          <ProspectField
            label="Job Title"
            value={form.jobTitle}
            onChange={(value) => updateField("jobTitle", value)}
            placeholder="Head of Growth"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ProspectField
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
            placeholder="alex@acme.com"
          />
          <ProspectField
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
            placeholder="+1 555 0199"
          />
        </div>
        <ProspectField
          label="Notes"
          value={form.notes}
          onChange={(value) => updateField("notes", value)}
          placeholder="Met at SaaS Summit..."
          multiline
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <DialogButton type="secondary" onClick={onClose}>
          Cancel
        </DialogButton>
        <DialogButton type="primary" disabled={submitting}>
          {submitting ? "Adding..." : "Add Prospect"}
        </DialogButton>
      </div>
    </form>
  );
}

interface ProspectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
}

function ProspectField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  multiline,
}: ProspectFieldProps) {
  const className =
    "w-full px-3 py-2 text-sm rounded-lg border border-falbor-elements-borderColor bg-falbor-elements-background-depth-2 text-falbor-elements-textPrimary focus:outline-none focus:ring-1 focus:ring-purple-500";
  return (
    <div>
      <label className="block text-xs font-medium text-falbor-elements-textSecondary mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={2}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </div>
  );
}
