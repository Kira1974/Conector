"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalValidationPipe = void 0;
const common_1 = require("@nestjs/common");
class GlobalValidationPipe extends common_1.ValidationPipe {
    constructor() {
        super({
            transform: true,
            whitelist: false,
            forbidNonWhitelisted: true,
            disableErrorMessages: false,
            exceptionFactory: (validationErrors = []) => {
                const errors = GlobalValidationPipe.formatValidationErrors(validationErrors);
                return new common_1.BadRequestException({
                    message: 'Validation failed',
                    errors,
                    statusCode: 400
                });
            }
        });
    }
    static formatValidationErrors(validationErrors) {
        return validationErrors.map((error) => ({
            field: error.property,
            value: error.value,
            constraints: error.constraints ? Object.values(error.constraints) : [],
            children: error.children && error.children.length > 0
                ? GlobalValidationPipe.formatValidationErrors(error.children)
                : undefined
        }));
    }
}
exports.GlobalValidationPipe = GlobalValidationPipe;
//# sourceMappingURL=global-validation.pipe.js.map