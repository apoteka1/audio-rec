import { StatusBar } from "expo-status-bar";
import { Button, StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect } from "react";
import { Audio } from "expo-av";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

export default function App() {
	const [recording, setRecording] = useState();
	const [recordings, setRecordings] = useState([]);
	const [message, setMessage] = useState("");

	useEffect(() => {
		const fetchRecordings = async () => {
			const recsJSON = await AsyncStorage.getItem("locallyStoredAudio");
			const recs = recsJSON != null ? JSON.parse(recsJSON) : [];
			setRecordings(recs);
		};

		fetchRecordings().catch(console.error);
	}, []);

	async function startRecording() {
		try {
			const permission = await Audio.requestPermissionsAsync();

			if (permission.status === "granted") {
				await Audio.setAudioModeAsync({
					allowsRecordingIOS: true,
					playsInSilentModeIOS: true,
				});

				const { recording } = await Audio.Recording.createAsync(
					Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
				);

				setRecording(recording);
			} else {
				setMessage(
					"Please grant permission to app to access microphone"
				);
			}
		} catch (err) {
			console.error("Failed to start recording", err);
		}
	}

	async function deleteRecording(uri) {
		try {
			await FileSystem.deleteAsync(uri);

			let updatedRecordings = [...recordings].filter(
				(r) => r.file !== uri
			);

			setRecordings(updatedRecordings);

			await AsyncStorage.setItem(
				"locallyStoredAudio",
				JSON.stringify(updatedRecordings)
			);
		} catch (err) {
			console.log(err);
		}
	}

	async function stopRecording() {
		setRecording(undefined);
		await recording.stopAndUnloadAsync();

		let updatedRecordings = [...recordings];
		const { sound, status } = await recording.createNewLoadedSoundAsync();

		updatedRecordings.push({
			sound: sound,
			duration: getDurationFormatted(status.durationMillis),
			file: recording.getURI(),
		});

		setRecordings(updatedRecordings);
		await AsyncStorage.setItem(
			"locallyStoredAudio",
			JSON.stringify(updatedRecordings)
		);
	}

	function getDurationFormatted(millis) {
		const minutes = millis / 1000 / 60;
		const minutesDisplay = Math.floor(minutes);
		const seconds = Math.round((minutes - minutesDisplay) * 60);
		const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;

		return `${minutesDisplay}:${secondsDisplay}`;
	}

	function getRecordingLines() {
		return recordings.map((recordingLine, index) => {
			return (
				<View key={recordingLine.file} style={styles.row}>
					<Text style={styles.fill}>
						Take {index + 1} - {recordingLine.duration}
					</Text>
					<Button
						style={styles.button}
						onPress={() => recordingLine.sound.replayAsync()}
						title="Play"
					></Button>
					<Button
						style={styles.button}
						onPress={() => Sharing.shareAsync(recordingLine.file)}
						title="Share"
					></Button>
					<Button
						style={styles.button}
						onPress={() => deleteRecording(recordingLine.file)}
						title="Delete"
					></Button>
				</View>
			);
		});
	}

	return (
		<View style={styles.container}>
			<Text>{message}</Text>
			<StatusBar style="auto" />
			<Button
				title={recording ? "stop recording" : "start recording"}
				onPress={recording ? stopRecording : startRecording}
			/>
			{getRecordingLines()}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
});
