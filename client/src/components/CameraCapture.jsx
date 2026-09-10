import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw } from 'lucide-react';

const CameraCapture = forwardRef(({ onCapture }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera requires HTTPS. Please access the site using a secure (https://) connection.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied or unavailable. ' + err.message);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    capturePhoto
  }));

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    // Check if camera is covered (pixels are entirely black) OR if it's a hardware placeholder (grayscale)
    const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const data = imageData.data;
    let isBlank = true;
    let isGrayscale = true;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      
      // Check for absolute black
      if (r > 15 || g > 15 || b > 15) {
        isBlank = false;
      }
      
      // Check for grayscale (hardware disabled placeholders are usually perfect gray/white)
      // A real photo will have R, G, B values that differ by more than just 2-3 points
      if (Math.abs(r - g) > 5 || Math.abs(g - b) > 5) {
        isGrayscale = false;
      }

      if (!isBlank && !isGrayscale) break;
    }

    if (isBlank || isGrayscale) {
      setError('Camera appears to be blocked or disabled by a hardware switch! Please enable it.');
      setIsCapturing(false);
      return;
    }
    
    setIsCapturing(true);
    const photoDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    
    // Simulate face detection check (in a real app, use blazeface here)
    setTimeout(() => {
      setIsCapturing(false);
      onCapture(photoDataUrl);
    }, 500);
  };

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-danger flex flex-col items-center">
        <p className="mb-4">{error}</p>
        <button onClick={startCamera} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={18} /> Retry Camera
        </button>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-soft bg-black aspect-video flex flex-col justify-end">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});

export default CameraCapture;
