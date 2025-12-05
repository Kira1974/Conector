/**
 * Domain model for key resolution request
 * Used internally by use cases - independent of external providers
 */
export interface KeyResolutionRequest {
  correlationId: string;
  key: string;
  keyType?: string;
}

/**
 * Domain model for DIFE person data
 * Used for mapping DIFE response to Creditor entity
 */
export interface DifePersonData {
  /** Person identification data */
  person?: {
    identificationNumber?: string;
    identificationType?: string;
    legalCompanyName?: string;
    firstName?: string;
    lastName?: string;
    secondName?: string;
    secondLastName?: string;
    personType?: string;
  };

  /** Participant bank information */
  participant?: {
    nit?: string;
    spbvi?: string;
  };

  /** Payment method details */
  paymentMethod?: {
    number?: string;
    type?: string;
  };
}

/**
 * Domain model for key resolution response
 * Represents the resolved key information from any provider
 */
export interface KeyResolutionResponse {
  correlationId: string;
  executionId?: string;
  traceId?: string;
  resolvedKey?: {
    keyType: string;
    keyValue: string;
    participant: {
      nit: string;
      spbvi: string;
    };
    paymentMethod: {
      number: string;
      type: string;
    };
    person: {
      identificationNumber: string;
      identificationType: string;
      legalCompanyName?: string;
      firstName?: string;
      lastName?: string;
      secondName?: string;
      secondLastName?: string;
      personType: string;
    };
  } & DifePersonData;
  status?: string;
  errors?: string[];
}
