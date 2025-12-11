// components/QRCodeGenerator.js
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeGenerator({ value, size = 200 }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (value && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
}