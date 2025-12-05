export interface ErrorDetail {
  field?: string;
  code: string;
  message: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: any;
  timestamp?: string;
  errors?: string[];
  error?: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}
