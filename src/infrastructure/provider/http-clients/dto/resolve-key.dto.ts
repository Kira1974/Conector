import { IsString, IsNotEmpty, IsObject, Length } from 'class-validator';

import { KeyTypeDife, PaymentMethodTypeDife, IdentificationTypeDife, PersonTypeDife } from '@core/constant';

export class ResolveKeyRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Correlation ID is required in metadata' })
  @Length(1, 50, { message: 'Correlation ID must be between 1 and 50 characters' })
  correlation_id: string;

  @IsObject()
  key: {
    type: KeyTypeDife;
    value: string;
  };

  @IsObject()
  time_marks: {
    C110: string;
    C120: string;
  };
}

export interface TimelineDto {
  requestReceivedAt?: string;
  requestSentToDifeAt?: string;
  difeReceivedAt?: string;
  difeRespondedAt?: string;
}

export interface ResolveKeyResponseDto {
  correlation_id: string;
  execution_id?: string;
  trace_id?: string;
  key?: {
    key: {
      type: KeyTypeDife;
      value: string;
    };
    participant: {
      nit: string;
      spbvi: string;
    };
    payment_method: {
      type: PaymentMethodTypeDife;
      number: string;
    };
    person: {
      type: PersonTypeDife;
      legal_name?: string; // Added for juridical persons
      identification: {
        type: IdentificationTypeDife;
        number: string;
      };
      name: {
        first_name: string;
        second_name: string;
        last_name: string;
        second_last_name: string;
      };
    };
  };
  status?: string;
  errors?: {
    code: string;
    description: string;
  }[];
  time_marks?: {
    C110?: string;
    C120?: string;
    C210?: string;
    C215?: string;
    C230?: string;
    C240?: string;
    C310?: string;
    C320?: string;
  };
}
