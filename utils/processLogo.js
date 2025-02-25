/**
 * Process a logo image to meet specific requirements
 * - Convert to PNG format
 * - Ensure specified aspect ratio by adding white padding
 * - Ensure minimum size requirements
 * - Return as base64 encoded string
 * 
 * @param {File} file - The image file to process
 * @param {Object} options - Processing options
 * @param {number} options.aspectRatio - Target aspect ratio (width/height)
 * @param {number} options.minWidth - Minimum width in pixels
 * @param {number} options.minHeight - Minimum height in pixels
 * @param {boolean} options.square - Whether to create a square version
 * @param {boolean} options.ico - Whether to create an ICO version
 * @param {boolean} options.transparent - Whether to use transparent background
 * @returns {Promise<Object>} - Object containing base64 encoded images
 */
export async function processLogo(file, options = {}) {
  const {
    aspectRatio = 2.5,
    minWidth = 400,
    minHeight = 160,
    square = true,
    ico = true,
    transparent = false
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const img = new Image();
        img.onload = async () => {
          try {
            // Process rectangular logo
            const rectBase64 = await createRectangularLogo(img, aspectRatio, minWidth, minHeight, transparent);
            
            // Process square logo if requested
            const squareBase64 = square ? await createSquareLogo(img, 40, transparent) : null;
            
            // Process ICO if requested
            const icoBase64 = ico && square ? await createIcoFromSquare(img, transparent) : null;
            
            resolve({
              rectangular: rectBase64,
              square: squareBase64,
              ico: icoBase64
            });
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
 * Create a rectangular logo with the specified aspect ratio
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {number} aspectRatio - Target aspect ratio (width/height)
 * @param {number} minWidth - Minimum width in pixels
 * @param {number} minHeight - Minimum height in pixels
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {Promise<string>} - Base64 encoded image
 */
async function createRectangularLogo(img, aspectRatio, minWidth, minHeight, transparent = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Get the original dimensions
  const origWidth = img.width;
  const origHeight = img.height;
  
  // Calculate the current aspect ratio
  const currentRatio = origWidth / origHeight;
  
  // Determine new dimensions to achieve the target aspect ratio
  let newWidth, newHeight;
  if (currentRatio > aspectRatio) {
    // Image is too wide, add padding to the top and bottom
    newWidth = origWidth;
    newHeight = Math.round(origWidth / aspectRatio);
  } else {
    // Image is too tall, add padding to the left and right
    newHeight = origHeight;
    newWidth = Math.round(origHeight * aspectRatio);
  }
  
  // Ensure minimum size requirements
  if (newWidth < minWidth || newHeight < minHeight) {
    const scaleFactor = Math.max(minWidth / newWidth, minHeight / newHeight);
    newWidth = Math.round(newWidth * scaleFactor);
    newHeight = Math.round(newHeight * scaleFactor);
  }
  
  // Set canvas dimensions
  canvas.width = newWidth;
  canvas.height = newHeight;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, newWidth, newHeight);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, newWidth, newHeight);
  }
  
  // Calculate position to center the image
  const x = Math.floor((newWidth - origWidth) / 2);
  const y = Math.floor((newHeight - origHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y);
  
  // Return as base64
  return canvas.toDataURL('image/png');
}

/**
 * Create a square logo with white padding
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {number} minSize - Minimum size in pixels
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {Promise<string>} - Base64 encoded image
 */
async function createSquareLogo(img, minSize = 40, transparent = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Get the original dimensions
  const origWidth = img.width;
  const origHeight = img.height;
  
  // Determine the size of the square
  let squareSize = Math.max(origWidth, origHeight);
  
  // Ensure minimum size
  if (squareSize < minSize) {
    squareSize = minSize;
  }
  
  // Set canvas dimensions
  canvas.width = squareSize;
  canvas.height = squareSize;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, squareSize, squareSize);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, squareSize, squareSize);
  }
  
  // Calculate position to center the image
  const x = Math.floor((squareSize - origWidth) / 2);
  const y = Math.floor((squareSize - origHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y);
  
  // Return as base64
  return canvas.toDataURL('image/png');
}

/**
 * Create an ICO file from a square image
 * Note: This is a simplified version since browsers can't directly create ICO files
 * We'll just create a PNG that can be used as a favicon
 * 
 * @param {HTMLImageElement} img - The image element
 * @param {boolean} transparent - Whether to use transparent background
 * @returns {Promise<string>} - Base64 encoded image
 */
async function createIcoFromSquare(img, transparent = false) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions to 64x64 (common favicon size)
  canvas.width = 64;
  canvas.height = 64;
  
  // Get the original dimensions
  const origWidth = img.width;
  const origHeight = img.height;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, 64, 64);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 64, 64);
  }
  
  // Calculate scaling to fit the image within 64x64
  const scale = Math.min(64 / origWidth, 64 / origHeight);
  const scaledWidth = Math.round(origWidth * scale);
  const scaledHeight = Math.round(origHeight * scale);
  
  // Calculate position to center the image
  const x = Math.floor((64 - scaledWidth) / 2);
  const y = Math.floor((64 - scaledHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  
  // Return as base64
  return canvas.toDataURL('image/png');
} 