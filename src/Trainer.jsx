import { useEffect, useRef, useState } from 'react';
import {
    HandLandmarker,
    FilesetResolver
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
import kNear from './knear';
import './style.css';

export default function Trainer() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [handLandmarker, setHandLandmarker] = useState(null);
    const [results, setResults] = useState(null);
    const [captureData, setCaptureData] = useState({
        good_luck: [],
        good_job: [],
        loser: [],
        rock: [],
        call_me: []
    });

    const [knn, setKnn] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [labelScores, setLabelScores] = useState([]);

    // Model laden
    useEffect(() => {
        const loadModel = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            const model = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1
            });

            setHandLandmarker(model);
        };

        loadModel();
    }, []);

    const enableWebcam = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            video.play();

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Dit is optioneel maar visueel handig:
            canvas.style.width = "100%";
            video.style.width = "100%";

            predictWebcam();
        };
    };

    const predictWebcam = async () => {
        if (!handLandmarker) return;

        const result = await handLandmarker.detectForVideo(
            videoRef.current,
            performance.now()
        );

        if (result.landmarks.length > 0) {
            const hand = result.landmarks[0];
            setResults(result);
            drawLandmarks(hand);
        }

        requestAnimationFrame(predictWebcam);
    };

    const simplifyLandmarks = (landmarks) =>
        landmarks.map(p => ({ x: p.x, y: p.y, z: p.z }));

    const flattenLandmarks = (landmarks) =>
        landmarks.flatMap(p => [p.x, p.y, p.z]);

    const drawLandmarks = (landmarks) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        for (const point of landmarks) {
            const x = point.x * width;
            const y = point.y * height;

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
        }

        ctx.restore();
    };


    const capturePose = (label) => {
        if (results && results.landmarks.length > 0) {
            const simplified = simplifyLandmarks(results.landmarks[0]);
            setCaptureData(prev => ({
                ...prev,
                [label]: [...prev[label], simplified]
            }));
            console.log(`📸 "${label}" opgeslagen`);
        } else {
            console.warn("❌ Geen hand gevonden");
        }
    };

    const downloadJSON = (label) => {
        const data = captureData[label];
        if (!data || data.length === 0) return;

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${label}.json`;
        link.click();
    };

    const trainModel = () => {
        const model = new kNear(3);
        for (const [label, samples] of Object.entries(captureData)) {
            samples.forEach(sample => {
                model.learn(flattenLandmarks(sample), label);
            });
        }

        setKnn(model);
        alert("✅ Model getraind!");
    };

    const evaluateAccuracy = () => {
        if (!knn) return alert("❗Train eerst je model");

        let correct = 0;
        let total = 0;

        const labelCorrect = {};
        const labelTotal = {};

        for (const [label, samples] of Object.entries(captureData)) {
            labelCorrect[label] = 0;
            labelTotal[label] = samples.length;

            for (const sample of samples) {
                const prediction = knn.classify(flattenLandmarks(sample));
                if (prediction === label) labelCorrect[label]++;
                if (prediction === label) correct++;
                total++;
            }
        }

        const acc = ((correct / total) * 100).toFixed(2);
        setAccuracy(acc);

        const scores = Object.keys(labelCorrect).map(label => ({
            label,
            correct: labelCorrect[label],
            total: labelTotal[label],
            percent: ((labelCorrect[label] / labelTotal[label]) * 100).toFixed(1)
        }));

        setLabelScores(scores);

        alert(`✅ Accuracy: ${acc}%`);
    };


    return (
        <section>
            <header className="app-header">
                <h1>📦 Trainer Interface</h1>
                <p>Gebruik dit scherm om handgebaren vast te leggen en je KNN-model te trainen en evalueren.</p>
            </header>

            <div className="videoView">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} id="output_canvas" />
            </div>

            <div className="controls">
                <button onClick={enableWebcam}>🎥 Start Webcam</button>
                <button onClick={trainModel}>🧠 Train Model</button>
                <button onClick={evaluateAccuracy}>📊 Evaluate Accuracy</button>
                {accuracy && (
                    <>
                        <p className="gesture-label">✅ Accuracy: {accuracy}%</p>
                        <ul className="distance-list">
                            {labelScores.map(({ label, correct, total, percent }) => (
                                <li key={label}>
                                    {label.replace("_", " ")}: {correct}/{total} correct
                                    <span style={{ float: "right", color: "#00ffd5" }}>{percent}%</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                <div className="pose-controls">
                    <h3>📸 Capture & Download JSON</h3>
                    {['good_luck', 'good_job', 'loser', 'call_me', 'rock'].map(label => (
                        <div key={label}>
                            <button onClick={() => capturePose(label)}>
                                📸 Capture "{label.replace('_', ' ')}"
                            </button>
                            <button onClick={() => downloadJSON(label)}>
                                💾 Download "{label}.json"
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
