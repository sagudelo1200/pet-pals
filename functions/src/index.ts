import {setGlobalOptions} from "firebase-functions";

setGlobalOptions({maxInstances: 9});

export {crearPerfilPublico} from "./usuarios/crear";
export {actualizarPerfilPublico} from "./usuarios/actualizar";
