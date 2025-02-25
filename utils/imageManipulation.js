/**
 * Utility functions for advanced image manipulation
 * - Image cropping
 * - Background removal
 */

/**
 * Crop an image based on user-defined coordinates
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {Object} cropArea - The area to crop
 * @param {number} cropArea.x - X coordinate of the top-left corner
 * @param {number} cropArea.y - Y coordinate of the top-left corner
 * @param {number} cropArea.width - Width of the crop area
 * @param {number} cropArea.height - Height of the crop area
 * @returns {string} - Base64 encoded cropped image
 */
export function cropImage(img, cropArea) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Ensure integer dimensions for precise cropping
  // We use Math.floor to ensure we don't exceed the image boundaries
  const x = Math.floor(cropArea.x);
  const y = Math.floor(cropArea.y);
  const width = Math.floor(cropArea.width);
  const height = Math.floor(cropArea.height);
  
  // Log the crop dimensions for debugging
  console.log(`Cropping image: x=${x}, y=${y}, width=${width}, height=${height}`);
  console.log(`Original crop area: x=${cropArea.x}, y=${cropArea.y}, width=${cropArea.width}, height=${cropArea.height}`);
  
  // Set canvas dimensions to the crop area - must be exact
  canvas.width = width;
  canvas.height = height;
  
  // Draw only the cropped portion of the image
  ctx.drawImage(
    img,
    x, y, width, height, // Source rectangle
    0, 0, width, height // Destination rectangle
  );
  
  // Return as base64
  return canvas.toDataURL('image/png');
}

/**
 * Remove the background from an image using color similarity
 * This is a simple implementation that removes pixels similar to a selected color
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {Object} options - Background removal options
 * @param {string} options.targetColor - The color to remove (hex format)
 * @param {number} options.tolerance - Color similarity tolerance (0-255)
 * @returns {string} - Base64 encoded image with background removed
 */
export function removeBackground(img, options = {}) {
  const {
    targetColor = '#FFFFFF', // Default to white
    tolerance = 30 // Default tolerance
  } = options;
  
  // Parse the target color
  const r = parseInt(targetColor.slice(1, 3), 16);
  const g = parseInt(targetColor.slice(3, 5), 16);
  const b = parseInt(targetColor.slice(5, 7), 16);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions - must match image exactly
  canvas.width = img.width;
  canvas.height = img.height;
  
  // Draw the image
  ctx.drawImage(img, 0, 0);
  
  // Get the image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const pixelR = data[i];
    const pixelG = data[i + 1];
    const pixelB = data[i + 2];
    
    // Calculate color distance (simple Euclidean distance)
    const distance = Math.sqrt(
      Math.pow(pixelR - r, 2) +
      Math.pow(pixelG - g, 2) +
      Math.pow(pixelB - b, 2)
    );
    
    // If the color is similar to the target color, make it transparent
    if (distance < tolerance) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }
  
  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Return as base64
  return canvas.toDataURL('image/png');
}

/**
 * Advanced background removal using machine learning
 * This function uses the remove.bg API to remove backgrounds
 * 
 * @param {File} file - The image file
 * @param {Object} options - Background removal options
 * @param {string} options.targetColor - The color to remove (hex format)
 * @param {number} options.tolerance - Color similarity tolerance (0-255)
 * @returns {Promise<string>} - Base64 encoded image with background removed
 */
export async function removeBackgroundAI(file, options = {}) {
  const {
    targetColor = '#FFFFFF', // Default to white
    tolerance = 50 // Default tolerance
  } = options;
  
  // This is a placeholder for a more advanced implementation
  // In a real implementation, you would:
  // 1. Use a background removal API like remove.bg or similar
  // 2. Or implement a client-side ML model using TensorFlow.js
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Log original image dimensions for debugging
        console.log(`Background removal - Original image dimensions: ${img.width}x${img.height}`);
        
        // For now, we'll use our simple background removal as a placeholder
        // In a real implementation, you would call an API here
        const result = removeBackground(img, { 
          targetColor: targetColor,
          tolerance: tolerance
        });
        
        // Verify the dimensions are preserved
        const verifyImg = new Image();
        verifyImg.onload = () => {
          console.log(`Background removal - Result image dimensions: ${verifyImg.width}x${verifyImg.height}`);
          if (verifyImg.width !== img.width || verifyImg.height !== img.height) {
            console.warn('Background removal changed image dimensions!');
          }
          resolve(result);
        };
        verifyImg.onerror = () => reject(new Error('Failed to verify result image'));
        verifyImg.src = result;
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a cropping interface component
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {Function} onCropComplete - Callback when cropping is complete
 * @returns {HTMLElement} - The cropping interface element
 */
export function createCroppingInterface(img, onCropComplete) {
  // Create container
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.overflow = 'hidden';
  
  // Create image container
  const imgContainer = document.createElement('div');
  imgContainer.style.position = 'relative';
  
  // Clone the image
  const imgClone = new Image();
  imgClone.src = img.src;
  imgClone.style.display = 'block';
  imgClone.style.maxWidth = '100%';
  
  // Create crop selection box
  const cropBox = document.createElement('div');
  cropBox.style.position = 'absolute';
  cropBox.style.border = '2px dashed #fff';
  cropBox.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
  cropBox.style.cursor = 'move';
  
  // Add resize handles
  const handles = ['nw', 'ne', 'sw', 'se'];
  const handleElements = {};
  
  handles.forEach(handle => {
    const el = document.createElement('div');
    el.className = `crop-handle ${handle}`;
    el.style.position = 'absolute';
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = '#fff';
    
    // Position handles
    if (handle.includes('n')) el.style.top = '-5px';
    if (handle.includes('s')) el.style.bottom = '-5px';
    if (handle.includes('w')) el.style.left = '-5px';
    if (handle.includes('e')) el.style.right = '-5px';
    
    el.style.cursor = `${handle}-resize`;
    cropBox.appendChild(el);
    handleElements[handle] = el;
  });
  
  // Add elements to DOM
  imgContainer.appendChild(imgClone);
  imgContainer.appendChild(cropBox);
  container.appendChild(imgContainer);
  
  // Add crop button
  const cropButton = document.createElement('button');
  cropButton.textContent = 'Apply Crop';
  cropButton.style.marginTop = '10px';
  cropButton.style.padding = '8px 16px';
  cropButton.style.backgroundColor = '#0070f3';
  cropButton.style.color = 'white';
  cropButton.style.border = 'none';
  cropButton.style.borderRadius = '4px';
  cropButton.style.cursor = 'pointer';
  
  container.appendChild(cropButton);
  
  // Initialize crop box
  const initCropBox = () => {
    const imgWidth = imgClone.offsetWidth;
    const imgHeight = imgClone.offsetHeight;
    
    // Default to 80% of the image
    const cropWidth = Math.floor(imgWidth * 0.8);
    const cropHeight = Math.floor(imgHeight * 0.8);
    
    cropBox.style.left = `${Math.floor((imgWidth - cropWidth) / 2)}px`;
    cropBox.style.top = `${Math.floor((imgHeight - cropHeight) / 2)}px`;
    cropBox.style.width = `${cropWidth}px`;
    cropBox.style.height = `${cropHeight}px`;
  };
  
  // Initialize after image loads
  if (imgClone.complete) {
    initCropBox();
  } else {
    imgClone.onload = initCropBox;
  }
  
  // Add event listener for crop button
  cropButton.addEventListener('click', () => {
    // Get crop coordinates relative to the original image
    const scale = img.naturalWidth / imgClone.offsetWidth;
    
    const cropArea = {
      x: parseInt(cropBox.style.left) * scale,
      y: parseInt(cropBox.style.top) * scale,
      width: parseInt(cropBox.style.width) * scale,
      height: parseInt(cropBox.style.height) * scale
    };
    
    // Call the callback with crop coordinates
    onCropComplete(cropArea);
  });
  
  // Return the container
  return container;
} 