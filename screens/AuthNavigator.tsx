import React from 'react';
import { Block } from 'galio-framework';
import { useAuth } from '../services/context/AuthContext';
import Login from './Login';
import Welcome from './Welcome';
import { Text } from 'react-native';

const AuthNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  const loadingMessages = [
    /* Tips de cuidado y bienestar */
    '🚶‍♂️🐕 Un paseo diario mantiene a tu perro feliz y saludable.',
    '💧🐶 Lleva siempre agua fresca en los paseos.',
    '🦴🍖 Una dieta equilibrada es clave para la salud de tu mascota.',
    '🐾🔍 Revisa sus patitas al volver, pueden tener piedritas.',
    '🧘‍♂️🐕 El ejercicio reduce el estrés y la ansiedad.',
    '☀️🔥🐾 Evita pasear en horas de calor para cuidar sus patas.',
    /* Mensajes divertidos/tiernos */
    '🐶💤 "¿Otra vez pasear? ¡Estoy listo para la aventura!"',
    '🌎🐕 Cada paseo es una aventura para tu perro.',
    '🐶➡️👋 Una cola moviéndose es pura alegría.',
    '🐕💨 "¡Corre, salta y juega! ¡El mundo es nuestro!"',
    '🐾❤️ "Un paseo contigo es lo mejor del día."',
    '🐕🌳 "Explorar nuevos lugares es mi pasatiempo favorito."',
    /* Educación y responsabilidad */
    '🦺🐕 Usa siempre correa para la seguridad de tu perro.',
    '💩🗑️ Recoge siempre los desechos de tu mascota.',
    '📅🐶 Mantén sus vacunas y desparasitaciones al día.',
    '👂🐶 Escucha a tu perro, su lenguaje corporal dice mucho.',
  ];
  const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

  // Mientras carga, muestra un mensaje aleatorio de carga
  if (loading) {
    return (
      <Block flex center middle style={{ padding: 9 }}>
        <Text style={{ fontSize: 15, marginBottom: 20 }}>{randomMessage}</Text>
        <Text>Cargando...</Text>
      </Block>
    );
  }

  // Si hay usuario autenticado, muestra la pantalla de bienvenida
  if (user) {
    return <Welcome />;
  }

  // Si no hay usuario, muestra la pantalla de login
  return <Login />;
};

export default AuthNavigator;