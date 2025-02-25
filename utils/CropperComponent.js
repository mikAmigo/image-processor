import { useState, useRef, useEffect } from 'react';

/**
 * A React component for cropping images
 * 
 * @param {Object} props - Component props
 * @param {string} props.imageSrc - Source of the image to crop
 * @param {Function} props.onCropComplete - Callback when cropping is complete
 * @param {Function} props.onCancel - Callback when cropping is cancelled
 */
export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const cropBoxRef = useRef(null);
  
  // Initialize crop area when image loads
  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      initCropArea();
    } else if (img) {
      img.onload = initCropArea;
    }
    
    return () => {
      if (img) {
        img.onload = null;
      }
    };
  }, [imageSrc]);
  
  // Initialize the crop area
  const initCropArea = () => {
    const img = imageRef.current;
    if (!img) return;
    
    // Use Math.floor to ensure integer dimensions
    const width = Math.floor(img.offsetWidth * 0.8);
    const height = Math.floor(img.offsetHeight * 0.8);
    const x = Math.floor((img.offsetWidth - width) / 2);
    const y = Math.floor((img.offsetHeight - height) / 2);
    
    setCropArea({ x, y, width, height });
    setImageSize({ width: img.offsetWidth, height: img.offsetHeight });
  };
  
  // Handle mouse down for dragging
  const handleMouseDown = (e) => {
    e.preventDefault();
    
    // Check if we're clicking on a resize handle
    const target = e.target;
    if (target.className && target.className.includes('crop-handle')) {
      const handle = Array.from(target.classList)
        .find(cls => ['nw', 'ne', 'sw', 'se'].includes(cls));
      
      if (handle) {
        setResizing(handle);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }
    }
    
    // Otherwise, we're moving the entire crop box
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse move for dragging or resizing
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (resizing) {
      // Handle resizing
      const newCropArea = { ...cropArea };
      
      if (resizing.includes('n')) {
        newCropArea.y += deltaY;
        newCropArea.height -= deltaY;
      } else if (resizing.includes('s')) {
        newCropArea.height += deltaY;
      }
      
      if (resizing.includes('w')) {
        newCropArea.x += deltaX;
        newCropArea.width -= deltaX;
      } else if (resizing.includes('e')) {
        newCropArea.width += deltaX;
      }
      
      // Ensure minimum size
      if (newCropArea.width < 50) newCropArea.width = 50;
      if (newCropArea.height < 50) newCropArea.height = 50;
      
      // Ensure crop area stays within image bounds
      if (newCropArea.x < 0) {
        newCropArea.width += newCropArea.x;
        newCropArea.x = 0;
      }
      if (newCropArea.y < 0) {
        newCropArea.height += newCropArea.y;
        newCropArea.y = 0;
      }
      if (newCropArea.x + newCropArea.width > imageSize.width) {
        newCropArea.width = imageSize.width - newCropArea.x;
      }
      if (newCropArea.y + newCropArea.height > imageSize.height) {
        newCropArea.height = imageSize.height - newCropArea.y;
      }
      
      // Ensure integer dimensions for precise cropping
      newCropArea.x = Math.floor(newCropArea.x);
      newCropArea.y = Math.floor(newCropArea.y);
      newCropArea.width = Math.floor(newCropArea.width);
      newCropArea.height = Math.floor(newCropArea.height);
      
      setCropArea(newCropArea);
    } else {
      // Handle moving
      let newX = cropArea.x + deltaX;
      let newY = cropArea.y + deltaY;
      
      // Ensure crop area stays within image bounds
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + cropArea.width > imageSize.width) {
        newX = imageSize.width - cropArea.width;
      }
      if (newY + cropArea.height > imageSize.height) {
        newY = imageSize.height - cropArea.height;
      }
      
      // Ensure integer dimensions for precise cropping
      newX = Math.floor(newX);
      newY = Math.floor(newY);
      
      setCropArea({ ...cropArea, x: newX, y: newY });
    }
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    setResizing(null);
  };
  
  // Apply the crop
  const applyCrop = () => {
    const img = imageRef.current;
    if (!img) return;
    
    // Calculate crop coordinates relative to the original image
    const scale = img.naturalWidth / img.offsetWidth;
    
    // Ensure integer dimensions for precise cropping
    const scaledCropArea = {
      x: Math.floor(cropArea.x * scale),
      y: Math.floor(cropArea.y * scale),
      width: Math.floor(cropArea.width * scale),
      height: Math.floor(cropArea.height * scale)
    };
    
    // Create a canvas to draw the cropped image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set exact dimensions
    canvas.width = scaledCropArea.width;
    canvas.height = scaledCropArea.height;
    
    // Draw only the cropped portion of the image
    ctx.drawImage(
      img,
      scaledCropArea.x, scaledCropArea.y, scaledCropArea.width, scaledCropArea.height,
      0, 0, scaledCropArea.width, scaledCropArea.height
    );
    
    // Get the cropped image as base64
    const croppedImageBase64 = canvas.toDataURL('image/png');
    
    // Call the callback with the cropped image
    onCropComplete(croppedImageBase64);
  };
  
  // Set up event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, cropArea, resizing, imageSize]);
  
  return (
    <div className="image-cropper">
      <div className="cropper-container" ref={containerRef}>
        <div className="image-container" style={{ position: 'relative' }}>
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Image to crop"
            style={{ display: 'block', maxWidth: '100%' }}
          />
          <div
            ref={cropBoxRef}
            className="crop-box"
            style={{
              position: 'absolute',
              left: `${cropArea.x}px`,
              top: `${cropArea.y}px`,
              width: `${cropArea.width}px`,
              height: `${cropArea.height}px`,
              border: '2px dashed #fff',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              cursor: 'move'
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Resize handles */}
            <div className="crop-handle nw" style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: '#fff', top: '-5px', left: '-5px', cursor: 'nw-resize' }}></div>
            <div className="crop-handle ne" style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: '#fff', top: '-5px', right: '-5px', cursor: 'ne-resize' }}></div>
            <div className="crop-handle sw" style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: '#fff', bottom: '-5px', left: '-5px', cursor: 'sw-resize' }}></div>
            <div className="crop-handle se" style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: '#fff', bottom: '-5px', right: '-5px', cursor: 'se-resize' }}></div>
          </div>
        </div>
      </div>
      
      <div className="cropper-controls" style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          className="btn"
          onClick={applyCrop}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Apply Crop
        </button>
        <button
          className="btn"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
} 