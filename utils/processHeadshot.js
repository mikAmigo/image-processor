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
  
  // Calculate the current aspect ratio
  const currentRatio = origWidth / origHeight;
  
  // Determine the new dimensions that will give us the exact aspect ratio
  let newWidth, newHeight;
  
  // Calculate dimensions to achieve the exact target ratio
  if (currentRatio > targetAspect) {
    // Image is too wide, add padding to the top and bottom
    newWidth = origWidth;
    // Calculate exact height to match the aspect ratio
    // Use the target ratio directly to ensure precision
    newHeight = Math.ceil((newWidth * targetRatio[1]) / targetRatio[0]);
  } else {
    // Image is too tall, add padding to the left and right
    newHeight = origHeight;
    // Calculate exact width to match the aspect ratio
    // Use the target ratio directly to ensure precision
    newWidth = Math.ceil((newHeight * targetRatio[0]) / targetRatio[1]);
  }
  
  // Ensure minimum size requirements while maintaining exact aspect ratio
  if (newWidth < minWidth || newHeight < minHeight) {
    // Calculate scale factors for width and height
    const widthScale = minWidth / newWidth;
    const heightScale = minHeight / newHeight;
    
    // Use the larger scale factor to ensure both minimum dimensions are met
    const scaleFactor = Math.max(widthScale, heightScale);
    
    // Scale dimensions while maintaining exact aspect ratio
    if (widthScale > heightScale) {
      // Width is the limiting factor
      newWidth = minWidth;
      // Calculate height based on the exact ratio
      newHeight = Math.ceil((newWidth * targetRatio[1]) / targetRatio[0]);
    } else {
      // Height is the limiting factor
      newHeight = minHeight;
      // Calculate width based on the exact ratio
      newWidth = Math.ceil((newHeight * targetRatio[0]) / targetRatio[1]);
    }
    
    // Double-check to ensure we meet minimum requirements
    if (newWidth < minWidth) newWidth = minWidth;
    if (newHeight < minHeight) newHeight = minHeight;
    
    // Final verification of aspect ratio
    const actualRatio = newWidth / newHeight;
    const targetAspectRatio = targetRatio[0] / targetRatio[1];
    
    // If there's still a discrepancy, adjust to ensure exact ratio
    if (Math.abs(actualRatio - targetAspectRatio) > 0.0001) {
      // Prioritize the larger dimension to ensure minimum requirements
      if (newWidth / minWidth > newHeight / minHeight) {
        // Width has more margin, adjust it
        newWidth = Math.ceil(newHeight * targetAspectRatio);
      } else {
        // Height has more margin, adjust it
        newHeight = Math.ceil(newWidth / targetAspectRatio);
      }
    }
  }
  
  // Set canvas dimensions
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  // Fill with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, newWidth, newHeight);
  
  // Calculate position to center the image exactly
  const x = Math.floor((newWidth - origWidth) / 2);
  const y = Math.floor((newHeight - origHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y);
  
  // Return as base64
  return canvas.toDataURL('image/png');
} 