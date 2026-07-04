import React, { createContext, useContext, useState, ReactNode } from 'react'

interface CapturaTerritorialContextType {
  mostrarCaptura: boolean
  abrirCaptura: () => void
  cerrarCaptura: () => void
}

const CapturaTerritorialContext = createContext<
  CapturaTerritorialContextType | undefined
>(undefined)

export const CapturaTerritorialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [mostrarCaptura, setMostrarCaptura] = useState(false)

  const abrirCaptura = () => setMostrarCaptura(true)
  const cerrarCaptura = () => setMostrarCaptura(false)

  return (
    <CapturaTerritorialContext.Provider
      value={{ mostrarCaptura, abrirCaptura, cerrarCaptura }}
    >
      {children}
    </CapturaTerritorialContext.Provider>
  )
}

export const useCapturaTerritorial = () => {
  const context = useContext(CapturaTerritorialContext)
  if (!context) {
    throw new Error(
      'useCapturaTerritorial debe usarse dentro de CapturaTerritorialProvider'
    )
  }
  return context
}
