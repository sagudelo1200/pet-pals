import React from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { COLOR } from '@/constants';

const Mascotas: React.FC = () => {
	const mockMascotas = [
		{ id: '1', nombre: 'Luna', raza: 'Mestiza' },
		{ id: '2', nombre: 'Max', raza: 'Labrador' },
		{ id: '3', nombre: 'Nala', raza: 'Golden Retriever' },
		{ id: '4', nombre: 'Rocky', raza: 'Bulldog' },
	];

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.title}>Mis Mascotas</Text>
				<View style={styles.grid}>
					{mockMascotas.map((m) => (
						<View key={m.id} style={styles.card}>
							<Text style={styles.cardEmoji}>🐾</Text>
							<Text style={styles.cardTitle}>{m.nombre}</Text>
							<Text style={styles.cardSubtitle}>{m.raza}</Text>
							<TouchableOpacity activeOpacity={0.85} style={styles.cardButton}>
								<Text style={styles.cardButtonText}>Ver detalles</Text>
							</TouchableOpacity>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLOR.BASE,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		padding: 16,
		paddingBottom: 32,
	},
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: COLOR.TEXTO,
		marginBottom: 12,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap' as const,
		justifyContent: 'space-between',
	},
	card: {
		width: '100%',
		backgroundColor: COLOR.BLOQUE,
		borderColor: COLOR.BORDE,
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
	},
	cardEmoji: {
		fontSize: 28,
		marginBottom: 8,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: COLOR.TEXTO,
	},
	cardSubtitle: {
		fontSize: 13,
		color: COLOR.SUBTEXTO,
		marginTop: 2,
		marginBottom: 10,
	},
	cardButton: {
		backgroundColor: COLOR.PRIMARIO,
		paddingVertical: 10,
		borderRadius: 10,
		alignItems: 'center',
	},
	cardButtonText: {
		color: COLOR.TEXTO,
		fontWeight: '700',
	},
});

export default Mascotas;
