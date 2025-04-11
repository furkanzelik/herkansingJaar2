import { useEffect, useRef, useState } from 'react';
import {
    HandLandmarker,
    FilesetResolver
} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
import kNear from './knear';
import './style.css';

export default function App() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [handLandmarker, setHandLandmarker] = useState(null);
    const [knn, setKnn] = useState(null);
    const [detectedGesture, setDetectedGesture] = useState("...");
    const [gestureData, setGestureData] = useState({});

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

    useEffect(() => {
        const loadTrainingData = async () => {
            const knnModel = new kNear(3);
            const labels = ["good_luck", "good_job", "loser", "call_me", "rock"];
            const data = {};

            for (const label of labels) {
                try {
                    const res = await fetch(`/data/${label}.json`);
                    const json = await res.json();
                    data[label] = json;
                    json.forEach(example => {
                        knnModel.learn(flattenLandmarks(example), label);
                    });
                } catch (e) {
                    console.warn(`⚠️ ${label}.json niet gevonden`);
                }
            }

            setGestureData(data);
            setKnn(knnModel);
        };

        loadTrainingData();
    }, []);

    const enableWebcam = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            predictWebcam();
        };
    };

    const predictWebcam = async () => {
        if (!handLandmarker || !knn) return;

        const result = await handLandmarker.detectForVideo(
            videoRef.current,
            performance.now()
        );

        if (result.landmarks.length > 0) {
            const hand = result.landmarks[0];
            drawLandmarks(hand);

            const prediction = knn.classify(flattenLandmarks(hand));
            setDetectedGesture(prediction);
        }
        requestAnimationFrame(predictWebcam);
    };

    const flattenLandmarks = (landmarks) =>
        landmarks.flatMap(p => [p.x, p.y, p.z]);

    const drawLandmarks = (landmarks) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);

        for (const point of landmarks) {
            const x = point.x * width;
            const y = point.y * height;

            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#ff0000";
            ctx.fill();
        }

        ctx.restore();
    };


    return (
        <section>
            <header className="app-header">
                <h1>🖐️ Hand Gesture Translator</h1>
                <p>Laat een gebaar zien en krijg realtime voorspellingen!</p>
            </header>

            <div className="videoView">
                <video ref={videoRef} autoPlay muted playsInline />
                <canvas ref={canvasRef} id="output_canvas" />
                <p className="gesture-label">📢 Gebaar: {detectedGesture}</p>
            </div>

            <div className="controls">
                <button onClick={enableWebcam}>🎥 Start Webcam</button>
            </div>
        </section>
    );
}
