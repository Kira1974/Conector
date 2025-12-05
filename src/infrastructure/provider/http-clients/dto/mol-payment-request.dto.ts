export interface MolPaymentRequestDto {
  additional_informations: string;
  billing_responsible: string;
  creditor: {
    identification: {
      type: string;
      value: string;
    };
    key: {
      type: string;
      value: string;
    };
    name: string;
    participant: {
      id: string;
      spbvi: string;
    };
    payment_method: {
      currency: string;
      type: string;
      value: string;
    };
  };
  initiation_type: string;
  internal_id: string;
  key_resolution_id: string;
  payer: {
    identification: {
      type: string;
      value: string;
    };
    name: string;
    payment_method: {
      currency: string;
      type: string;
      value: string;
    };
  };
  qr_code_id: string;
  time_mark: {
    T110: string;
    T120: string;
  };
  transaction_amount: string;
  transaction_type: string;
}
