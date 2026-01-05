import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
export declare class HttpStatusMapper {
    static mapResponseCodeToHttpStatus(responseCode: TransferResponseCode): number;
}
