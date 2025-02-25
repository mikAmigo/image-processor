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
  
  // For 5:2 aspect ratio, we'll use exact integer math
  // For 5:2 ratio, width must be a multiple of 5 and height must be a multiple of 2
  let ratioNumerator = 5;
  let ratioDenominator = 2;
  
  // Calculate the current aspect ratio
  const currentRatio = origWidth / origHeight;
  
  // First, determine the base dimensions that will contain the original image
  let baseWidth, baseHeight;
  
  if (currentRatio > aspectRatio) {
    // Image is too wide, use original width and calculate height
    baseWidth = origWidth;
    baseHeight = Math.ceil(baseWidth / aspectRatio);
  } else {
    // Image is too tall, use original height and calculate width
    baseHeight = origHeight;
    baseWidth = Math.ceil(baseHeight * aspectRatio);
  }
  
  // Now ensure dimensions meet minimum requirements
  if (baseWidth < minWidth || baseHeight < minHeight) {
    if (baseWidth < minWidth) {
      baseWidth = minWidth;
      baseHeight = Math.ceil(baseWidth / aspectRatio);
    }
    if (baseHeight < minHeight) {
      baseHeight = minHeight;
      baseWidth = Math.ceil(baseHeight * aspectRatio);
    }
  }
  
  // For 5:2 ratio specifically, ensure width is a multiple of 5 and height is a multiple of 2
  // This guarantees an exact 5:2 ratio
  if (aspectRatio === 2.5) {
    // Round up width to next multiple of 5
    baseWidth = Math.ceil(baseWidth / 5) * 5;
    // Calculate exact height as width * 2 / 5
    baseHeight = (baseWidth * 2) / 5;
    
    // Ensure height is a multiple of 2 (it should be already, but double-check)
    if (baseHeight % 2 !== 0) {
      baseHeight = Math.ceil(baseHeight / 2) * 2;
      // Recalculate width to maintain exact ratio
      baseWidth = (baseHeight * 5) / 2;
    }
    
    // Final verification - ensure both dimensions are integers
    baseWidth = Math.round(baseWidth);
    baseHeight = Math.round(baseHeight);
    
    // One last check to ensure exact 5:2 ratio
    if (baseWidth / baseHeight !== 2.5) {
      console.warn("Adjusting dimensions for exact 5:2 ratio");
      // Force exact ratio by using integer multiples
      const unitHeight = 2;
      const unitWidth = 5;
      const units = Math.max(
        Math.ceil(baseHeight / unitHeight),
        Math.ceil(baseWidth / unitWidth)
      );
      baseWidth = unitWidth * units;
      baseHeight = unitHeight * units;
    }
  }
  
  // Set canvas dimensions using our calculated exact values
  canvas.width = baseWidth;
  canvas.height = baseHeight;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  // Calculate position to center the image exactly
  const x = Math.floor((canvas.width - origWidth) / 2);
  const y = Math.floor((canvas.height - origHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y);
  
  // Final verification - log dimensions and ratio for debugging
  const finalRatio = canvas.width / canvas.height;
  console.log(`Final dimensions: ${canvas.width}x${canvas.height}, ratio: ${finalRatio.toFixed(10)}`);
  console.log(`Target ratio: ${aspectRatio}, difference: ${Math.abs(finalRatio - aspectRatio).toFixed(10)}`);
  
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
  
  // Determine the size of the square - must be exactly square
  let squareSize = Math.max(origWidth, origHeight);
  
  // Ensure minimum size
  if (squareSize < minSize) {
    squareSize = minSize;
  }
  
  // Set canvas dimensions - must be exactly square
  canvas.width = squareSize;
  canvas.height = squareSize;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, squareSize, squareSize);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, squareSize, squareSize);
  }
  
  // Calculate position to center the image exactly
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
  // Create canvases for each size
  const sizes = [40, 48, 64];
  const largestSize = Math.max(...sizes);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas dimensions to the largest size
  canvas.width = largestSize;
  canvas.height = largestSize;
  
  // Get the original dimensions
  const origWidth = img.width;
  const origHeight = img.height;
  
  // Clear canvas with white or transparent background
  if (transparent) {
    ctx.clearRect(0, 0, largestSize, largestSize);
  } else {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, largestSize, largestSize);
  }
  
  // Calculate scaling to fit the image within the largest size
  const scale = Math.min(largestSize / origWidth, largestSize / origHeight);
  const scaledWidth = Math.round(origWidth * scale);
  const scaledHeight = Math.round(origHeight * scale);
  
  // Calculate position to center the image exactly
  const x = Math.floor((largestSize - scaledWidth) / 2);
  const y = Math.floor((largestSize - scaledHeight) / 2);
  
  // Draw the image
  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  
  // Return as base64
  return canvas.toDataURL('image/png');
} 