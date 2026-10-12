export type OperatorActionType =
  | 'SAY_MESSAGE'
  | 'ASK_USER'
  | 'WRITE_BUILDER_PROMPT'
  | 'SUBMIT_BUILDER_PROMPT'
  | 'OPEN_PAGE'
  | 'OPEN_SETTINGS'
  | 'OPEN_RESEARCH'
  | 'OPEN_PREVIEW'
  | 'READ_CURRENT_ERRORS'
  | 'SEND_FIX_PROMPT'
  | 'HIGHLIGHT_ELEMENT'
  | 'WAIT_FOR_BUILDER'
  | 'UPDATE_OPERATOR_MEMORY'
  | 'SWITCH_SETTINGS_TAB'
  | 'SWITCH_MODEL'
  | 'SWITCH_CHAT_MODE'
  | 'SIMULATE_CLICK';

export interface OperatorAction {
  type: OperatorActionType;
  payload?: any;
}

export interface OperatorResponse {
  message: string;
  actions: OperatorAction[];
}
