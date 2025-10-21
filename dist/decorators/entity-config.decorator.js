"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_CONFIG_METADATA = void 0;
exports.EntityConfig = EntityConfig;
const common_1 = require("@nestjs/common");
exports.ENTITY_CONFIG_METADATA = "ENTITY_CONFIG_METADATA";
function EntityConfig(config) {
    return (target) => {
        (0, common_1.SetMetadata)(exports.ENTITY_CONFIG_METADATA, config)(target);
    };
}
//# sourceMappingURL=entity-config.decorator.js.map