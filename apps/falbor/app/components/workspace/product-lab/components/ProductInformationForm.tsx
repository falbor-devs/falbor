"use client";

import type { ProductLabProjectForm } from "../types";

interface ProductInformationFormProps {
  value: ProductLabProjectForm;
  onChange: (value: ProductLabProjectForm) => void;
  disabled?: boolean;
}

export function ProductInformationForm({
  value,
  onChange,
  disabled = false,
}: ProductInformationFormProps) {
  const update = (field: keyof ProductLabProjectForm, next: string) =>
    onChange({ ...value, [field]: next });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm text-gray-700 dark:text-gray-300">
        Product name
        <input
          disabled={disabled}
          value={value.name}
          onChange={(event) => update("name", event.target.value)}
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
      <label className="text-sm text-gray-700 dark:text-gray-300">
        Website URL
        <input
          disabled={disabled}
          value={value.websiteUrl}
          onChange={(event) => update("websiteUrl", event.target.value)}
          placeholder="https://example.com"
          className="mt-1.5 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
      <label className="text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
        Product description
        <textarea
          disabled={disabled}
          value={value.productDescription}
          onChange={(event) => update("productDescription", event.target.value)}
          placeholder="What does the product do?"
          className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
      <label className="text-sm text-gray-700 dark:text-gray-300">
        Target audience
        <textarea
          disabled={disabled}
          value={value.targetAudience}
          onChange={(event) => update("targetAudience", event.target.value)}
          placeholder="Who is this for?"
          className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
      <label className="text-sm text-gray-700 dark:text-gray-300">
        Pricing information
        <textarea
          disabled={disabled}
          value={value.pricing}
          onChange={(event) => update("pricing", event.target.value)}
          placeholder="Plans, price, or unknown"
          className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
      <label className="text-sm text-gray-700 dark:text-gray-300 md:col-span-2">
        Main features
        <textarea
          disabled={disabled}
          value={value.features}
          onChange={(event) => update("features", event.target.value)}
          placeholder="One feature per line"
          className="mt-1.5 min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-[#0099ff] disabled:opacity-60 dark:border-gray-700"
        />
      </label>
    </div>
  );
}
