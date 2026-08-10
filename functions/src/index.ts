import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 9});

// Auth
export {enviarOTP} from "./auth/enviarOTP";
export {validarOTP} from "./auth/validarOTP";

// Usuarios
export {actualizarPerfilPublico} from "./usuarios/actualizar";

// Paseos
export {
  onCrearPaseoDirecto,
  escalarPaseoIndividual,
} from "./paseos/escalarSolicitudes";
export {onPaseoConfirmado} from "./paseos/chat";
