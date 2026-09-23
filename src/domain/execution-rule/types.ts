export type FieldState = 'HIDDEN' | 'DISPLAY' | 'OPTIONAL' | 'REQUIRED' | 'AUTO';
export type FieldSource = 'USER' | 'SAP' | 'MASTER' | 'CALCULATED' | 'DEFAULT';
export type FieldComponent =
  | 'input'
  | 'number'
  | 'select'
  | 'date'
  | 'dateRange'
  | 'textarea'
  | 'upload'
  | 'radio';

export interface DynamicFieldSchema {
  key: string;
  label: string;
  component: FieldComponent;
  state: FieldState;
  source: FieldSource;
  group: 'EXECUTION' | 'DELIVERY' | 'SERVICE' | 'ATTACHMENT';
  span?: 1 | 2;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: unknown;
  businessHelp?: string;
}

export interface ExecutionFormSchema {
  title: string;
  submitLabel: string;
  fields: DynamicFieldSchema[];
}

export type ExecutionFormValues = Record<string, unknown>;
