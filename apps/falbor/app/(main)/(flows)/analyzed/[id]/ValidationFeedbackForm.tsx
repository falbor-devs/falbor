"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export function ValidationFeedbackForm({ reportId }: { reportId: string }) {
  const [wouldUse, setWouldUse] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wouldUse === null) {
      toast.error("Please select if you would use it or not.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/analyzed/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, wouldUse, feedbackText }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");
      
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
        <div className="i-ph:check-circle-duotone text-5xl text-falbor-elements-icon-success" />
        <h3 className="text-xl font-bold text-falbor-elements-textPrimary">Feedback Submitted</h3>
        <p className="text-falbor-elements-textSecondary">Thank you for sharing your thoughts!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-falbor-elements-textPrimary text-center">What do you think?</h3>
        <p className="text-center text-falbor-elements-textSecondary text-sm">Would you use this product?</p>
        
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            onClick={() => setWouldUse(true)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium flex items-center justify-center gap-2 ${
              wouldUse === true 
                ? "border-falbor-elements-item-backgroundAccent bg-falbor-elements-item-backgroundAccent/10 text-falbor-elements-item-contentAccent" 
                : "border-falbor-elements-borderColor text-falbor-elements-textSecondary hover:border-falbor-elements-textTertiary"
            }`}
          >
            <div className="i-ph:thumbs-up-duotone text-xl" />
            Yes, I'd use it
          </button>
          
          <button
            type="button"
            onClick={() => setWouldUse(false)}
            className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium flex items-center justify-center gap-2 ${
              wouldUse === false 
                ? "border-red-500 bg-red-500/10 text-red-500" 
                : "border-falbor-elements-borderColor text-falbor-elements-textSecondary hover:border-falbor-elements-textTertiary"
            }`}
          >
            <div className="i-ph:thumbs-down-duotone text-xl" />
            No, I wouldn't
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-falbor-elements-textSecondary">
          Why / Why not? (Optional)
        </label>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          className="w-full min-h-[120px] p-4 bg-falbor-elements-background-depth-3 border border-falbor-elements-borderColor rounded-xl text-falbor-elements-textPrimary resize-none focus:outline-none focus:border-falbor-elements-item-contentAccent focus:ring-1 focus:ring-falbor-elements-item-contentAccent"
          placeholder="Tell us what you like or what's missing..."
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || wouldUse === null}
        className="w-full py-3.5 bg-falbor-elements-item-backgroundAccent text-falbor-elements-item-contentAccent font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <div className="i-svg-spinners:90-ring-with-bg text-xl" />
        ) : (
          <>
            Submit Feedback
            <div className="i-ph:paper-plane-right-fill" />
          </>
        )}
      </button>
    </form>
  );
}
