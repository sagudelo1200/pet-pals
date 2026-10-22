import React from 'react'
import { PantallaEconomia } from '@/screens/admin/AdminEconomia'

/** Contador: la misma economía que ve el admin, sin acciones. */
const ContadorEconomia: React.FC = () => <PantallaEconomia soloLectura />

export default ContadorEconomia
