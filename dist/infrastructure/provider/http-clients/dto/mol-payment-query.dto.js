"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolPaymentQueryRequestDto = void 0;
class MolPaymentQueryRequestDto {
    static byInternalId(internalId) {
        const dto = new MolPaymentQueryRequestDto();
        return Object.assign(dto, { internal_id: internalId });
    }
    static byEndToEndId(endToEndId) {
        const dto = new MolPaymentQueryRequestDto();
        return Object.assign(dto, { end_to_end_id: endToEndId });
    }
    static byDateRange(startDate, endDate) {
        const dto = new MolPaymentQueryRequestDto();
        return Object.assign(dto, {
            created_at_start: startDate,
            created_at_end: endDate
        });
    }
}
exports.MolPaymentQueryRequestDto = MolPaymentQueryRequestDto;
//# sourceMappingURL=mol-payment-query.dto.js.map