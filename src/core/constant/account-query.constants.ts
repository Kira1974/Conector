export enum AccountQueryState {
  SUCCESSFUL = 'SUCCESSFUL',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  REJECTED_BY_PROVIDER = 'REJECTED_BY_PROVIDER',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  ERROR = 'ERROR'
}

export const DifeErrorCodes: Record<string, string[]> = {
  FORMAT_VALIDATION: ['DIFE-4000', 'DIFE-5005'],

  BUSINESS_VALIDATION: [
    'DIFE-0001',
    'DIFE-0002',
    'DIFE-0003',
    'DIFE-0004',
    'DIFE-0005',
    'DIFE-0006',
    'DIFE-0007',
    'DIFE-4001',
    'DIFE-5001',
    'DIFE-5009',
    'DIFE-5012',
    'DIFE-5017'
  ],

  SERVICE_ERROR: [
    'DIFE-0008',
    'DIFE-5000',
    'DIFE-5003',
    'DIFE-9999',
    'DIFE-9991',
    'DIFE-9992',
    'DIFE-9993',
    'DIFE-9994',
    'DIFE-9995',
    'DIFE-9996',
    'DIFE-9997',
    'DIFE-9998'
  ]
};
