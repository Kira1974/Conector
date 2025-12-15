import { ConfirmationUseCase } from '@core/usecase/confirmation.usecase';
import { ConfirmationResponse } from '@core/model';
import { TransferConfirmationDto } from '../dto/transfer-confirmation.dto';
export declare class TransferConfirmationController {
    private readonly confirmationUseCase;
    constructor(confirmationUseCase: ConfirmationUseCase);
    handleConfirmation(notification: TransferConfirmationDto): ConfirmationResponse;
}
