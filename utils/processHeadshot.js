/**
 * Process a headshot image to meet specific requirements
 * - Convert to PNG format
 * - Ensure minimum size of 292x400 pixels
 * - Ensure aspect ratio of 73:100 by adding white padding
 * - Return as base64 encoded string
 * 
 * @param {File} file - The image file to process
 * @param {Object} options - Processing options
 * @param {number} options.minWidth - Minimum width in pixels
 * @param {number} options.minHeight - Minimum height in pixels
 * @param {Array<number>} options.targetRatio - Target aspect ratio as [width, height]
 * @returns {Promise<string>} - Base64 encoded image
 */
export async function processHeadshot(file, options = {}) {
  const {
    minWidth = 292,
    minHeight = 400,
    targetRatio = [73, 100]
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            const base64 = await createHeadshot(img, minWidth, minHeight, targetRatio);
            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a headshot with the specified aspect ratio
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {number} minWidth - Minimum width in pixels
 * @param {number} minHeight - Minimum height in pixels
 * @param {Array<number>} targetRatio - Target aspect ratio as [width, height]
 * @returns {Promise<string>} - Base64 encoded image
 */
async function createHeadshot(img, minWidth, minHeight, targetRatio) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Get the original dimensions
  const origWidth = img.width;
  const origHeight = img.height;
  
  // Calculate the target aspect ratio (width/height)
  const targetAspect = targetRatio[0] / targetRatio[1];
  
  // Determine the new dimensions that will give us the exact aspect ratio
  // Start with a width that's a multiple of targetRatio[0] and calculate the corresponding height
  let baseWidth = targetRatio[0];
  while (baseWidth < origWidth) {
    baseWidth += targetRatio[0];
  }
  
  // Calculate the corresponding height for this width to get exact ratio
  const baseHeight = (baseWidth * targetRatio[1]) / targetRatio[0];
  
  // Set canvas dimensions
  canvas.width = baseWidth;
  canvas.height = baseHeight;
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, baseWidth, baseHeight);
  
  // Calculate position to center the image
  const x = Math.floor((baseWidth - origWidth) / 2);
  const y = Math.floor((baseHeight - origHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y);
  
  // Ensure minimum size requirements
  if (baseWidth < minWidth || baseHeight < minHeight) {
    // Create a new canvas for the resized image
    const resizedCanvas = document.createElement('canvas');
    const resizedCtx = resizedCanvas.getContext('2d');
    
    // Calculate scale factors for width and height
    const widthScale = minWidth / baseWidth;
    const heightScale = minHeight / baseHeight;
    
    // Use the larger scale factor to ensure both minimum dimensions are met
    const scaleFactor = Math.max(widthScale, heightScale);
    
    // Calculate new dimensions that maintain the exact ratio
    const scaleWidth = Math.round(baseWidth * scaleFactor);
    const scaleHeight = Math.round(baseHeight * scaleFactor);
    
    // Set canvas dimensions
    resizedCanvas.width = scaleWidth;
    resizedCanvas.height = scaleHeight;
    
    // Fill with white background
    resizedCtx.fillStyle = 'white';
    resizedCtx.fillRect(0, 0, scaleWidth, scaleHeight);
    
    // Draw the original canvas onto the resized canvas
    resizedCtx.drawImage(canvas, 0, 0, baseWidth, baseHeight, 0, 0, scaleWidth, scaleHeight);
    
    // Return as base64
    return resizedCanvas.toDataURL('image/png');
  }
  
  // Return as base64
  return canvas.toDataURL('image/png');
} 