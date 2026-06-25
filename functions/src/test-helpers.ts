/**
 * Test Helper: Crear documento DIRECTA de prueba
 * Ejecutar: npm exec ts-node src/test-helpers.ts
 */

import * as admin from "firebase-admin";

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Helper function to create a test paseo (walk) directly in Firestore
 */
async function createTestDIRECTA() {
  try {
    const docRef = await db.collection("paseos").add({
      id_tutor: `test-tutor-${Date.now()}`,
      id_cuidador: `test-cuidador-${Date.now()}`,
      cuidador_nombre_visual: "Juan Cuidador Prueba",
      cuidador_foto_visual: "https://example.com/foto.jpg",
      estado: "PENDIENTE",
      fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      hora_inicio: new Date(Date.now() + 3600000).toISOString(),
      duracion_minutos: 30,
      id_mascota: "test-mascota",
    });

    console.log("✅ DIRECTA de prueba creada");
    console.log(`   Paseo ID: ${docRef.id}`);
    console.log("   Estado: PENDIENTE (disparará trigger en segundos)");
    console.log(
      "   Cloud Task se ejecutará en ~10 minutos para escalar a ABIERTA"
    );

    // Esperar 5 segundos y mostrar lo que pasó
    console.log("\n⏳ Revisando estado después de 5 segundos...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const updatedDoc = await docRef.get();
    console.log(`   Estado actual: ${updatedDoc.data()?.estado}`);
    console.log(
      `   id_cuidador: ${updatedDoc.data()?.id_cuidador || "eliminado"}`
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", (error as Error).message);
    process.exit(1);
  }
}

createTestDIRECTA();
