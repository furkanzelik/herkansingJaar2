import { useEffect, useRef, useState } from 'react';
import {
    HandLandmarker,
    FilesetResolver,
    DrawingUtils
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
import './style.css';

export default function Trainer() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const drawUtilsRef = useRef(null);
    const [handLandmarker, setHandLandmarker] = useState(null);
    const [results, setResults] = useState(null);
    const [gestureData, setGestureData] = useState({});
    const [captureData, setCaptureData] = useState({
        good_luck: [],
        good_job: [],
        loser: [],
        rock: [],
        call_me: [],
    });

    // Model laden
    useEffect(() => {
        const loadModel = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            const handModel = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1
            });

            setHandLandmarker(handModel);
        };

        loadModel();
    }, []);

    // Laad bestaande JSON data
    useEffect(() => {
        const loadGestureData = async () => {
            const labels = ["good_luck", "good_job", "loser", "call_me", "rock"];
            const loadedData = {};

            for (const label of labels) {
                try {
                    const res = await fetch(`/data/${label}.json`);
                    const json = await res.json();
                    loadedData[label] = json;
                } catch (error) {
                    console.warn(`⚠️ Kan ${label}.json niet laden`, error);
                }
            }

            setGestureData(loadedData);
        };

        loadGestureData();
    }, []);

    const enableWebcam = async () => {
        if (!handLandmarker) return;

        const video = videoRef.current;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            drawUtilsRef.current = new DrawingUtils(canvas.getContext('2d'));
            predictWebcam();
        };
    };

    const predictWebcam = async () => {
        if (!handLandmarker) return;

        const video = videoRef.current;
        const result = await handLandmarker.detectForVideo(video, performance.now());

        if (result.landmarks.length > 0) {
            drawResults(result);
            setResults(result);
        }

        requestAnimationFrame(predictWebcam);
    };

    const drawResults = (results) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        for (let hand of results.landmarks) {
            for (let point of hand) {
                const x = point.x * width;
                const y = point.y * height;

                ctx.beginPath();
                ctx.arc(x, y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = "#ff0000";
                ctx.fill();
            }
        }

        ctx.restore();
    };

    const simplifyLandmarks = (landmarks) =>
        landmarks.map(p => ({ x: p.x, y: p.y, z: p.z }));

    const flattenLandmarks = (landmarks) =>
        landmarks.flatMap(p => [p.x, p.y, p.z]);

    const euclideanDistance = (a, b) =>
        Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

    const predictSample = (sample) => {
        const currentFlat = flattenLandmarks(sample);
        const distances = [];

        for (const [label, samples] of Object.entries(gestureData)) {
            for (const s of samples) {
                const sampleFlat = flattenLandmarks(s);
                const dist = euclideanDistance(currentFlat, sampleFlat);
                distances.push({ label, dist });
            }
        }

        distances.sort((a, b) => a.dist - b.dist);
        const topK = distances.slice(0, 3);

        const votes = {};
        for (const { label } of topK) {
            votes[label] = (votes[label] || 0) + 1;
        }

        return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
    };

    const evaluateAccuracy = () => {
        let correct = 0;
        let total = 0;

        for (const [label, samples] of Object.entries(gestureData)) {
            for (const sample of samples) {
                const prediction = predictSample(sample);
                if (prediction === label) correct++;
                total++;
            }
        }

        const accuracy = ((correct / total) * 100).toFixed(2);
        alert(`✅ Accuracy: ${accuracy}% (${correct}/${total} correct)`);
        console.log(`📊 Evaluatie voltooid — Accuracy: ${accuracy}%`);
    };

    const capturePose = (label) => {
        if (results && results.landmarks.length > 0) {
            const simplified = simplifyLandmarks(results.landmarks[0]);
            setCaptureData(prev => ({
                ...prev,
                [label]: [...prev[label], simplified]
            }));
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

    return (
        <section>
            <header className="app-header">
                <h1>📦 Trainer Interface</h1>
                <p>Gebruik dit scherm om trainingsdata vast te leggen en je model te evalueren.</p>
            </header>

            <div className="videoView">
                <div style={{ position: 'relative' }}>
                    <video ref={videoRef} autoPlay muted playsInline />
                    <canvas ref={canvasRef} id="output_canvas" />
                </div>
            </div>

            <div className="controls">
                <h2>🎥 Data verzamelen</h2>
                <button onClick={enableWebcam}>🎥 Start Webcam</button>
                <button onClick={evaluateAccuracy}>✅ Evaluate Accuracy</button>

                <div className="pose-controls">
                    <h3>📸 Capture & Download JSON</h3>
                    {['good_luck', 'good_job', 'loser', 'call_me', 'rock'].map((label) => (
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
