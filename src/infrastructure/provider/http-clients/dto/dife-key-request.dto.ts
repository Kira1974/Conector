import { KeyTypeDife } from '@core/constant';

export interface DifeKeyRequestDto {
  correlation_id: string;
  key: {
    type: KeyTypeDife;
    value: string;
  };
  time_marks: {
    C110: string;
    C120: string;
  };
}
