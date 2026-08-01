"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorage = exports.FieldValue = exports.firebaseApp = exports.adminAuth = exports.adminDb = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
Object.defineProperty(exports, "getStorage", { enumerable: true, get: function () { return storage_1.getStorage; } });
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
let firebaseApp;
if ((0, app_1.getApps)().length === 0) {
    try {
        if (clientEmail && privateKey) {
            exports.firebaseApp = firebaseApp = (0, app_1.initializeApp)({
                credential: (0, app_1.cert)({
                    projectId,
                    clientEmail,
                    privateKey: privateKey.replace(/\\n/g, '\n'),
                }),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
            console.log('Firebase Admin SDK inicializado con cuenta de servicio.');
        }
        else {
            exports.firebaseApp = firebaseApp = (0, app_1.initializeApp)({
                projectId,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
            console.log('Firebase Admin SDK inicializado usando projectId.');
        }
    }
    catch (error) {
        console.warn('Advertencia: No se pudo inicializar Firebase Admin SDK. Usando inicialización mínima.', error);
        exports.firebaseApp = firebaseApp = (0, app_1.initializeApp)({ projectId });
    }
}
else {
    exports.firebaseApp = firebaseApp = (0, app_1.getApp)();
}
const adminDb = (0, firestore_1.getFirestore)(firebaseApp);
exports.adminDb = adminDb;
const adminAuth = (0, auth_1.getAuth)(firebaseApp);
exports.adminAuth = adminAuth;
