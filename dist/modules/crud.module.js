"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CrudModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudModule = void 0;
const common_1 = require("@nestjs/common");
const crud_service_1 = require("../services/crud.service");
let CrudModule = CrudModule_1 = class CrudModule {
    static forRoot(options) {
        return {
            module: CrudModule_1,
            providers: [
                {
                    provide: "CRUD_OPTIONS",
                    useValue: options,
                },
                crud_service_1.CrudService,
            ],
            exports: [crud_service_1.CrudService],
            global: options.isGlobal || false,
        };
    }
};
exports.CrudModule = CrudModule;
exports.CrudModule = CrudModule = CrudModule_1 = __decorate([
    (0, common_1.Module)({})
], CrudModule);
//# sourceMappingURL=crud.module.js.map