export type UserTurnInput = {
  text: string;
  images: string[];
  videos: string[];
  full_text?: string;
};

export type PromptHistoryMessage = {
  role: "user" | "assistant";
  text: string;
  images?: string[];
  videos?: string[];
};

export type PromptConstructionStrategy =
  | "create_from_input"
  | "update_from_history"
  | "update_from_file_snapshot";

export type Stack =
  | "html_css"
  | "html_tailwind"
  | "react_tailwind"
  | "bootstrap"
  | "ionic_tailwind"
  | "vue_tailwind";

export type PromptConstructionPlan = {
  generation_type: "create" | "update";
  input_mode: "image" | "video" | "text";
  stack: Stack;
  construction_strategy: PromptConstructionStrategy;
};
