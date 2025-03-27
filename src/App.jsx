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

    const [captureData, setCaptureData] = useState({
        good_luck:[],
        good_job:[],
        loser:[],
        rock:[],
        call_me:[],
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
                numHands: 2
            });

            setHandLandmarker(handModel);
        };

        loadModel();
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
        const now = performance.now();

        const result = await handLandmarker.detectForVideo(video, now);
        setResults(result);




        if (result.landmarks.length > 0) {
            console.log("Hand detected");
            console.log(result.landmarks); // alleen loggen bij gedetecteerde hand
            drawResults(result);

            const thumb = result.landmarks[0][4];
            imageRef.current.style.transform = `translate(${
                video.videoWidth - thumb.x * video.videoWidth
            }px, ${thumb.y * video.videoHeight}px)`;
        }

        requestAnimationFrame(predictWebcam);
    };

    // Alleen punten tekenen
    const drawResults = (results) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!results || results.landmarks.length === 0) return;

        for (let hand of results.landmarks) {
            drawUtilsRef.current.drawLandmarks(hand, {
                radius: 4,
                color: '#FF0000',
                lineWidth: 2
            });
        }
    };

    const logAllHands = () => {
        if (results) {
            results.landmarks.forEach((hand) => {
                console.log(hand[4]); // Thumb tip
            });
        }
    };

    function simplifyLandmarks(landmarks) {
        return landmarks.map(point => ({
            x: point.x,
            y: point.y,
            z: point.z
        }));
    }


    function capturePose(label) {
        if (results && results.landmarks.length > 0) {
            const simplified = simplifyLandmarks(results.landmarks[0]); // neem eerste hand
            setCaptureData(prev => ({
                ...prev,
                [label]: [...prev[label], simplified]
            }));
            console.log(`Gebaar "${label}" opgeslagen ✅`);
        } else {
            console.warn("Geen hand gevonden om op te slaan ❌");
        }
    }

    function downloadJSON(label) {
        const blob = new Blob(
            [JSON.stringify(captureData[label], null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${label}.json`;
        link.click();
    }


    return (
        <section>
            <div className="videoView">
                <div style={{ position: 'relative' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                    />
                    <canvas
                        ref={canvasRef}
                        id="output_canvas"
                    />
                    <div ref={imageRef} id="myimage">hoi</div>
                </div>
            </div>

            <div className="controls">
                <h1>Handpose detection</h1>
                <button onClick={enableWebcam}>START WEBCAM</button>
                <button onClick={logAllHands}>LOG DATA</button>

                <div className="pose-controls">
                    <h3>📥 Gebaren vastleggen & downloaden:</h3>
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
