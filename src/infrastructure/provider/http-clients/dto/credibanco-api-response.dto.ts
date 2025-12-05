export interface CredibancoApiResponse {
  status?: string;
  code?: string;
  message?: string;
  data?: any;
  end_to_end_id?: string;
  execution_id?: string;
  errors?: {
    code: string;
    description: string;
  }[];
  error?: {
    id?: string;
    code: string;
    description: string;
    message?: string;
    details?: any[];
  };
}
