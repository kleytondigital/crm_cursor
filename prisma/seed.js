"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = __importStar(require("bcrypt"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var hasAutomationsEnabled, result, error_1, systemCompanyId, existing, result, systemCompany, companyId, existing, result, company, superAdminPassword, hashedPassword;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    hasAutomationsEnabled = false;
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n      SELECT EXISTS (\n        SELECT 1 \n        FROM information_schema.columns \n        WHERE table_schema = 'public'\n        AND table_name = 'companies' \n        AND column_name = 'automationsEnabled'\n      ) as exists\n    "], ["\n      SELECT EXISTS (\n        SELECT 1 \n        FROM information_schema.columns \n        WHERE table_schema = 'public'\n        AND table_name = 'companies' \n        AND column_name = 'automationsEnabled'\n      ) as exists\n    "])))];
                case 2:
                    result = _g.sent();
                    hasAutomationsEnabled = (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.exists) !== null && _b !== void 0 ? _b : false;
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _g.sent();
                    console.warn('Não foi possível verificar se a coluna automationsEnabled existe. Continuando...');
                    return [3 /*break*/, 4];
                case 4:
                    if (!!hasAutomationsEnabled) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n      SELECT id FROM companies WHERE slug = 'sistema' LIMIT 1\n    "], ["\n      SELECT id FROM companies WHERE slug = 'sistema' LIMIT 1\n    "])))];
                case 5:
                    existing = _g.sent();
                    if (!((_c = existing[0]) === null || _c === void 0 ? void 0 : _c.id)) return [3 /*break*/, 6];
                    systemCompanyId = existing[0].id;
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, prisma.$queryRaw(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n        INSERT INTO companies (id, name, slug, \"isActive\", \"createdAt\", \"updatedAt\")\n        VALUES (gen_random_uuid(), 'Sistema', 'sistema', true, NOW(), NOW())\n        RETURNING id\n      "], ["\n        INSERT INTO companies (id, name, slug, \"isActive\", \"createdAt\", \"updatedAt\")\n        VALUES (gen_random_uuid(), 'Sistema', 'sistema', true, NOW(), NOW())\n        RETURNING id\n      "])))];
                case 7:
                    result = _g.sent();
                    systemCompanyId = ((_d = result[0]) === null || _d === void 0 ? void 0 : _d.id) || '';
                    _g.label = 8;
                case 8: return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, prisma.company.upsert({
                        where: { slug: 'sistema' },
                        update: {},
                        create: {
                            name: 'Sistema',
                            slug: 'sistema',
                            isActive: true,
                            automationsEnabled: false,
                        },
                    })];
                case 10:
                    systemCompany = _g.sent();
                    systemCompanyId = systemCompany.id;
                    _g.label = 11;
                case 11:
                    if (!!hasAutomationsEnabled) return [3 /*break*/, 16];
                    return [4 /*yield*/, prisma.$queryRaw(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n      SELECT id FROM companies WHERE slug = 'exemplo-empresa' LIMIT 1\n    "], ["\n      SELECT id FROM companies WHERE slug = 'exemplo-empresa' LIMIT 1\n    "])))];
                case 12:
                    existing = _g.sent();
                    if (!((_e = existing[0]) === null || _e === void 0 ? void 0 : _e.id)) return [3 /*break*/, 13];
                    companyId = existing[0].id;
                    return [3 /*break*/, 15];
                case 13: return [4 /*yield*/, prisma.$queryRaw(templateObject_5 || (templateObject_5 = __makeTemplateObject(["\n        INSERT INTO companies (id, name, slug, email, phone, document, \"isActive\", \"createdAt\", \"updatedAt\")\n        VALUES (\n          gen_random_uuid(), \n          'Empresa Exemplo', \n          'exemplo-empresa', \n          'contato@exemplo.com',\n          '(11) 99999-9999',\n          '12.345.678/0001-90',\n          true, \n          NOW(), \n          NOW()\n        )\n        RETURNING id\n      "], ["\n        INSERT INTO companies (id, name, slug, email, phone, document, \"isActive\", \"createdAt\", \"updatedAt\")\n        VALUES (\n          gen_random_uuid(), \n          'Empresa Exemplo', \n          'exemplo-empresa', \n          'contato@exemplo.com',\n          '(11) 99999-9999',\n          '12.345.678/0001-90',\n          true, \n          NOW(), \n          NOW()\n        )\n        RETURNING id\n      "])))];
                case 14:
                    result = _g.sent();
                    companyId = ((_f = result[0]) === null || _f === void 0 ? void 0 : _f.id) || '';
                    _g.label = 15;
                case 15: return [3 /*break*/, 18];
                case 16: return [4 /*yield*/, prisma.company.upsert({
                        where: { slug: 'exemplo-empresa' },
                        update: {},
                        create: {
                            name: 'Empresa Exemplo',
                            slug: 'exemplo-empresa',
                            email: 'contato@exemplo.com',
                            phone: '(11) 99999-9999',
                            document: '12.345.678/0001-90',
                            isActive: true,
                            automationsEnabled: false,
                        },
                    })];
                case 17:
                    company = _g.sent();
                    companyId = company.id;
                    _g.label = 18;
                case 18: return [4 /*yield*/, bcrypt.hash('superadmin123', 10)];
                case 19:
                    superAdminPassword = _g.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'superadmin@exemplo.com' },
                            update: {},
                            create: {
                                email: 'superadmin@exemplo.com',
                                password: superAdminPassword,
                                name: 'Super Administrador',
                                role: 'SUPER_ADMIN',
                                companyId: systemCompanyId,
                                isActive: true,
                            },
                        })];
                case 20:
                    _g.sent();
                    return [4 /*yield*/, bcrypt.hash('123456', 10)];
                case 21:
                    hashedPassword = _g.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@exemplo.com' },
                            update: {},
                            create: {
                                email: 'admin@exemplo.com',
                                password: hashedPassword,
                                name: 'Administrador',
                                role: 'ADMIN',
                                companyId: companyId,
                                isActive: true,
                            },
                        })];
                case 22:
                    _g.sent();
                    // Criar usuário comum
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'user@exemplo.com' },
                            update: {},
                            create: {
                                email: 'user@exemplo.com',
                                password: hashedPassword,
                                name: 'Usuário Comum',
                                role: 'USER',
                                companyId: companyId,
                                isActive: true,
                            },
                        })];
                case 23:
                    // Criar usuário comum
                    _g.sent();
                    // Configurações globais do sistema
                    return [4 /*yield*/, prisma.systemSettings.upsert({
                            where: { id: 1 },
                            update: {},
                            create: {
                                id: 1,
                                crmName: 'Darkmode CRM',
                                slogan: 'Soluções em atendimento',
                                version: '1.0.0',
                            },
                        })];
                case 24:
                    // Configurações globais do sistema
                    _g.sent();
                    // Estágios padrão do pipeline agora são criados pela migration após os status customizados
                    // Os estágios devem ser criados manualmente através da interface após criar os status customizados
                    console.log('Seed executado com sucesso!');
                    console.log('================================');
                    console.log('Credenciais criadas:');
                    console.log('Super Admin:');
                    console.log('  Email: superadmin@exemplo.com');
                    console.log('  Senha: superadmin123');
                    console.log('Admin:');
                    console.log('  Email: admin@exemplo.com');
                    console.log('  Senha: 123456');
                    console.log('Usuário:');
                    console.log('  Email: user@exemplo.com');
                    console.log('  Senha: 123456');
                    console.log('================================');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5;
