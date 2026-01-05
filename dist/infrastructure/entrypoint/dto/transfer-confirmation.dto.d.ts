export declare class SettlementErrorDto {
    code: string;
    description: string;
}
export declare class SettlementPayloadDto {
    execution_id: string;
    end_to_end_id: string;
    status: string;
    errors?: SettlementErrorDto[];
    qr_code_id?: string;
    time_marks?: any;
}
export declare class SettlementPropertiesDto {
    event_date: string;
    trace_id: string;
}
export declare class CredibancoSettlementResultDto {
    event_name: string;
    event_type: string;
    payload: SettlementPayloadDto;
    properties: SettlementPropertiesDto;
}
export declare class TransferConfirmationDto {
    id: string;
    source: string;
    status: string;
    payload: CredibancoSettlementResultDto;
}
