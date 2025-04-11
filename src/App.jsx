import { useEffect, useRef, useState } from 'react';
import {
    HandLandmarker,
    FilesetResolver,
    DrawingUtils
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
import './style.css';

export default function App() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const drawUtilsRef = useRef(null);

    const [handLandmarker, setHandLandmarker] = useState(null);
    const [webcamRunning, setWebcamRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [gestureData, setGestureData] = useState({});
    const [detectedGesture, setDetectedGesture] = useState("...");
    const [distanceScores, setDistanceScores] = useState([]);

    // 🧠 Model laden
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

    // 📁 JSON gesture data laden
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

        setWebcamRunning(true);

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
        if (!handLandmarker || !webcamRunning) return;

        const video = videoRef.current;
        const result = await handLandmarker.detectForVideo(video, performance.now());
        setResults(result);

        if (result.landmarks.length > 0) {
            drawResults(result);

            const thumb = result.landmarks[0][4];
            imageRef.current.style.transform = `translate(${
                video.videoWidth - thumb.x * video.videoWidth
            }px, ${thumb.y * video.videoHeight}px)`;

            knnClassify(result.landmarks[0], 3);
        } else {
            setDetectedGesture("...");
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

    const flattenLandmarks = (landmarks) =>
        landmarks.flatMap(p => [p.x, p.y, p.z]);

    const euclideanDistance = (a, b) =>
        Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));

    const knnClassify = (currentLandmarks, k = 3) => {
        const currentFlat = flattenLandmarks(currentLandmarks);
        const distances = [];

        for (const [label, samples] of Object.entries(gestureData)) {
            for (const sample of samples) {
                const sampleFlat = flattenLandmarks(sample);
                const dist = euclideanDistance(currentFlat, sampleFlat);
                distances.push({ label, dist });
            }
        }

        distances.sort((a, b) => a.dist - b.dist);
        const topK = distances.slice(0, k);

        const votes = {};
        for (const { label } of topK) {
            votes[label] = (votes[label] || 0) + 1;
        }

        let bestLabel = "Onbekend 🤔";
        let maxVotes = 0;

        for (const [label, count] of Object.entries(votes)) {
            if (count > maxVotes) {
                bestLabel = label;
                maxVotes = count;
            }
        }

        const averagePerLabel = {};
        const countPerLabel = {};

        for (const { label, dist } of distances) {
            averagePerLabel[label] = (averagePerLabel[label] || 0) + dist;
            countPerLabel[label] = (countPerLabel[label] || 0) + 1;
        }

        const formattedScores = Object.keys(averagePerLabel).map(label => ({
            label,
            avg: (averagePerLabel[label] / countPerLabel[label]).toFixed(4)
        }));

        setDistanceScores(formattedScores);
        setDetectedGesture(bestLabel.replace("_", " "));
    };

    return (
        <section>
            <header className="app-header">
                <h1>🖐️ Gesture Predictor</h1>
                <p>Start je webcam en zie welk handgebaar herkend wordt.</p>
            </header>

            <div className="videoView">
                <div style={{ position: 'relative' }}>
                    <video ref={videoRef} autoPlay muted playsInline />
                    <canvas ref={canvasRef} id="output_canvas" />
                    <div ref={imageRef} id="myimage" />
                    <p className="gesture-label">📢 Gebaar: {detectedGesture}</p>
                    <ul className="distance-list">
                        {distanceScores.map(({ label, avg }) => (
                            <li key={label}>
                                {label.replace("_", " ")}: <strong>{avg}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="controls">
                <h2>Live Herkenning</h2>
                <button onClick={enableWebcam}>🎥 Start Webcam</button>
            </div>
        </section>
    );
}
