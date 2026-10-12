import React, { useRef, useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { classNames } from '~/utils/classNames';

interface ImageEditorProps {
  imageUrl: string;
  onBack: () => void;
  onAddToChat: (file: File, dataUrl: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ imageUrl, onBack, onAddToChat }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#a855f7'); 
  const [brushSize, setBrushSize] = useState(5);
  
  
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      setImageObj(img);
      drawInitialImage(img);
    };
  }, [imageUrl]);

  const drawInitialImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const imgRatio = img.width / img.height;
    const containerRatio = containerWidth / containerHeight;
    
    let drawWidth = containerWidth;
    let drawHeight = containerHeight;
    
    if (imgRatio > containerRatio) {
      drawHeight = containerWidth / imgRatio;
    } else {
      drawWidth = containerHeight * imgRatio;
    }

    
    canvas.width = img.width;
    canvas.height = img.height;
    
    
    canvas.style.width = `${drawWidth}px`;
    canvas.style.height = `${drawHeight}px`;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize * (canvasRef.current!.width / canvasRef.current!.clientWidth); 
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.closePath();
      setIsDrawing(false);
    }
  };

  const handleClear = () => {
    if (imageObj) {
      drawInitialImage(imageObj);
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `edited-image-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onAddToChat(file, dataUrl);
    } catch (err) {
      console.error('Failed to save edited image', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-falbor-elements-background-depth-1">
      {}
      <div className="flex items-center justify-between px-6 py-4 border-b border-falbor-elements-borderColor shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-falbor-elements-background-depth-3 text-falbor-elements-textSecondary transition-colors"
            title="Back to Generator"
          >
            <div className="i-ph:arrow-left text-lg" />
          </button>
          <div className="font-semibold text-falbor-elements-textPrimary flex items-center gap-2">
            <div className="i-ph:paint-brush text-purple-500" />
            Image Editor
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-falbor-elements-background-depth-2 px-3 py-1.5 rounded-lg border border-falbor-elements-borderColor">
            <label htmlFor="color-picker" className="sr-only">Color</label>
            <input 
              id="color-picker"
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            
            <div className="w-px h-4 bg-falbor-elements-borderColor mx-1" />
            
            <div className="flex items-center gap-2 text-falbor-elements-textSecondary">
              <div className="i-ph:circle-fill text-xs" />
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 accent-purple-500"
              />
              <div className="i-ph:circle-fill text-lg" />
            </div>
          </div>

          <Button 
            onClick={handleClear}
            className="bg-falbor-elements-background-depth-3 hover:bg-falbor-elements-background-depth-4 text-falbor-elements-textPrimary px-3 py-1.5 h-auto text-sm"
          >
            <div className="i-ph:arrow-u-up-left mr-1" />
            Reset
          </Button>

          <Button 
            onClick={handleSave}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 h-auto text-sm font-medium shadow-sm"
          >
            <div className="i-ph:check mr-1" />
            Add to chat
          </Button>
        </div>
      </div>

      {}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden bg-[#000] flex items-center justify-center p-4 relative"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair shadow-2xl rounded-md bg-white touch-none"
        />
        
        {}
        {!imageObj && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 gap-3">
            <div className="i-svg-spinners:90-ring-with-bg text-4xl" />
            <p>Loading image...</p>
          </div>
        )}
      </div>
    </div>
  );
};
