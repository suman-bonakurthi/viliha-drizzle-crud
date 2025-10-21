"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudService = CrudService;
function CrudService(config) {
    return function (target) {
        Reflect.defineMetadata("crud:config", config, target);
        return target;
    };
}
//# sourceMappingURL=crud-service.decorator.js.map