import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 9});

export {actualizarPerfilPublico} from "./usuarios/actualizar";
export {
  onCrearPaseoDirecto,
  escalarPaseoIndividual,
} from "./paseos/escalarSolicitudes";
export {onPaseoConfirmado} from "./paseos/chat";
