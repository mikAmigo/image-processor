import { useState } from 'react';
import Head from 'next/head';
import { processLogo } from '../utils/processLogo';
import { processHeadshot } from '../utils/processHeadshot';
import { removeBackground, removeBackgroundAI } from '../utils/imageManipulation';
import ImageCropper from '../utils/CropperComponent';

export default function Home() {
  const [activeTab, setActiveTab] = useState('logo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Logo state
  const [logoFile, setLogoFile] = useState(null);
  const [logoResults, setLogoResults] = useState(null);
  const [transparentBg, setTransparentBg] = useState(false);
  
  // Headshot state
  const [headshotFile, setHeadshotFile] = useState(null);
  const [headshotResult, setHeadshotResult] = useState(null);
  
  // Cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [cropperImage, setCropperImage] = useState(null);
  const [cropperType, setCropperType] = useState(null); // 'logo' or 'headshot'
  
  // Background removal state
  const [removeBackgroundOption, setRemoveBackgroundOption] = useState(false);
  const [bgRemovalTolerance, setBgRemovalTolerance] = useState(30);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoResults(null);
      setError(null);
      setSuccess(null);
      
      // Create a preview URL for the cropper
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropperImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleHeadshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setHeadshotFile(file);
      setHeadshotResult(null);
      setError(null);
      setSuccess(null);
      
      // Create a preview URL for the cropper
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropperImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCrop = (type) => {
    setCropperType(type);
    setShowCropper(true);
  };
  
  const handleCropComplete = async (croppedImageBase64) => {
    setShowCropper(false);
    
    try {
      setLoading(true);
      
      // Create a file from the cropped image
      const response = await fetch(croppedImageBase64);
      const blob = await response.blob();
      const file = new File([blob], cropperType === 'logo' ? 'cropped_logo.png' : 'cropped_headshot.png', { type: 'image/png' });
      
      // Process the cropped image
      if (cropperType === 'logo') {
        setLogoFile(file);
        await handleLogoSubmit(null, file);
      } else {
        setHeadshotFile(file);
        await handleHeadshotSubmit(null, file);
      }
    } catch (err) {
      setError('Error processing cropped image: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCropCancel = () => {
    setShowCropper(false);
  };
  
  const handleLogoSubmit = async (e, croppedFile = null) => {
    if (e) e.preventDefault();
    
    const fileToProcess = croppedFile || logoFile;
    
    if (!fileToProcess) {
      setError('Please select a logo file');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let processedFile = fileToProcess;
      
      // Apply background removal if selected
      if (removeBackgroundOption) {
        const bgRemovedBase64 = await removeBackgroundAI(fileToProcess, {
          targetColor: bgColor,
          tolerance: bgRemovalTolerance
        });
        const response = await fetch(bgRemovedBase64);
        const blob = await response.blob();
        processedFile = new File([blob], 'bg_removed_logo.png', { type: 'image/png' });
      }
      
      const results = await processLogo(processedFile, {
        aspectRatio: 2.5, // Exactly 5/2 = 2.5 for precise ratio
        minWidth: 400,
        minHeight: 160,
        square: true,
        ico: true,
        transparent: transparentBg
      });
      
      setLogoResults(results);
      setSuccess('Logo processed successfully!');
    } catch (err) {
      setError('Error processing logo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleHeadshotSubmit = async (e, croppedFile = null) => {
    if (e) e.preventDefault();
    
    const fileToProcess = croppedFile || headshotFile;
    
    if (!fileToProcess) {
      setError('Please select a headshot file');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      let processedFile = fileToProcess;
      
      // Apply background removal if selected
      if (removeBackgroundOption) {
        const bgRemovedBase64 = await removeBackgroundAI(fileToProcess, {
          targetColor: bgColor,
          tolerance: bgRemovalTolerance
        });
        const response = await fetch(bgRemovedBase64);
        const blob = await response.blob();
        processedFile = new File([blob], 'bg_removed_headshot.png', { type: 'image/png' });
      }
      
      const result = await processHeadshot(processedFile, {
        minWidth: 292,
        minHeight: 400,
        targetRatio: [73, 100]
      });
      
      setHeadshotResult(result);
      setSuccess('Headshot processed successfully!');
    } catch (err) {
      setError('Error processing headshot: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const downloadBase64 = (base64Data, fileName) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }).catch(err => {
      setError('Failed to copy: ' + err.message);
    });
  };
  
  return (
    <div className="container">
      <Head>
        <title>🤖🦾🤳🏽</title>
        <meta name="description" content="Process images to specific formats and dimensions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <header className="header">
        <h1>🤖🦾🤳🏽 Amigo Clone Builder Image Processor 🤖🦾🤳🏽</h1>
      </header>
      
      <main className="main">
        {showCropper ? (
          <div className="cropper-modal">
            <h2>Crop Image</h2>
            <p>Drag the corners to adjust the crop area</p>
            <ImageCropper 
              imageSrc={cropperImage}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          </div>
        ) : (
          <>
            <div className="tabs">
              <div 
                className={`tab ${activeTab === 'logo' ? 'active' : ''}`}
                onClick={() => setActiveTab('logo')}
              >
                Logo Processor
              </div>
              <div 
                className={`tab ${activeTab === 'headshot' ? 'active' : ''}`}
                onClick={() => setActiveTab('headshot')}
              >
                Headshot Processor
              </div>
            </div>
            
            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}
            
            {success && (
              <div className="alert alert-success">
                {success}
              </div>
            )}
            
            <div className={`tab-content ${activeTab === 'logo' ? 'active' : ''}`}>
              <div className="card">
                <h2>Logo Processor</h2>
                <p>Upload a logo to process it into the following formats:</p>
                <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                  <li>Rectangular logo (5:2 aspect ratio, min 400x160 pixels)</li>
                  <li>Square logo (1:1 aspect ratio, min 40x40 pixels)</li>
                  <li>ICO file for favicon (with sizes 40x40, 48x48, 64x64)</li>
                </ul>
                
                <form onSubmit={handleLogoSubmit}>
                  <div className="form-group">
                    <label htmlFor="logo">Select Logo Image:</label>
                    <input 
                      type="file" 
                      id="logo" 
                      className="form-control" 
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </div>
                  
                  {logoFile && (
                    <div className="form-group">
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleCrop('logo')}
                        style={{ marginRight: '10px', backgroundColor: '#6c757d' }}
                      >
                        Crop Image
                      </button>
                    </div>
                  )}
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={transparentBg}
                        onChange={(e) => setTransparentBg(e.target.checked)}
                      />
                      Use transparent background
                    </label>
                    <p className="checkbox-help">
                      When checked, the background will be transparent instead of white
                    </p>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={removeBackgroundOption}
                        onChange={(e) => setRemoveBackgroundOption(e.target.checked)}
                      />
                      Remove background
                    </label>
                    <p className="checkbox-help">
                      Attempts to remove the background from the image
                    </p>
                  </div>
                  
                  {removeBackgroundOption && (
                    <div className="form-group" style={{ marginLeft: '1.5rem' }}>
                      <label htmlFor="bgTolerance">Background Removal Tolerance:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="range" 
                          id="bgTolerance" 
                          min="10" 
                          max="100" 
                          value={bgRemovalTolerance}
                          onChange={(e) => setBgRemovalTolerance(parseInt(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span>{bgRemovalTolerance}</span>
                      </div>
                      <p className="checkbox-help">
                        Higher values remove more colors similar to the background
                      </p>
                      
                      <label htmlFor="bgColor" style={{ marginTop: '10px' }}>Background Color:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="color" 
                          id="bgColor" 
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                        />
                        <span>{bgColor}</span>
                      </div>
                      <p className="checkbox-help">
                        Select the color to remove from the background
                      </p>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={loading || !logoFile}
                  >
                    {loading ? 'Processing...' : 'Process Logo'}
                  </button>
                </form>
              </div>
              
              {logoResults && (
                <div className="preview-container">
                  <div className="preview-item">
                    <h3>Rectangular Logo (5:2)</h3>
                    <img 
                      src={logoResults.rectangular} 
                      alt="Rectangular Logo" 
                      className="preview-image" 
                      style={{ background: transparentBg ? 'repeating-conic-gradient(#f0f0f0 0% 25%, #fafafa 0% 50%) 50% / 20px 20px' : 'white' }}
                    />
                    <div className="preview-info">
                      Aspect ratio: 5:2, Min size: 400x160 pixels
                      {transparentBg && <span>, Transparent background</span>}
                    </div>
                    <div className="preview-actions">
                      <button 
                        className="btn" 
                        onClick={() => downloadBase64(logoResults.rectangular, 'rectangular_logo.png')}
                      >
                        Download
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => copyToClipboard(logoResults.rectangular)}
                      >
                        Copy Base64
                      </button>
                    </div>
                  </div>
                  
                  <div className="preview-item">
                    <h3>Square Logo (1:1)</h3>
                    <img 
                      src={logoResults.square} 
                      alt="Square Logo" 
                      className="preview-image" 
                      style={{ background: transparentBg ? 'repeating-conic-gradient(#f0f0f0 0% 25%, #fafafa 0% 50%) 50% / 20px 20px' : 'white' }}
                    />
                    <div className="preview-info">
                      Aspect ratio: 1:1, Min size: 40x40 pixels
                      {transparentBg && <span>, Transparent background</span>}
                    </div>
                    <div className="preview-actions">
                      <button 
                        className="btn" 
                        onClick={() => downloadBase64(logoResults.square, 'square_logo.png')}
                      >
                        Download
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => copyToClipboard(logoResults.square)}
                      >
                        Copy Base64
                      </button>
                    </div>
                  </div>
                  
                  <div className="preview-item">
                    <h3>Favicon</h3>
                    <img 
                      src={logoResults.ico} 
                      alt="Favicon" 
                      className="preview-image" 
                      style={{ 
                        maxWidth: '64px', 
                        margin: '0 auto',
                        background: transparentBg ? 'repeating-conic-gradient(#f0f0f0 0% 25%, #fafafa 0% 50%) 50% / 20px 20px' : 'white'
                      }}
                    />
                    <div className="preview-info">
                      Sizes: 40x40, 48x48, 64x64 pixels
                      {transparentBg && <span>, Transparent background</span>}
                    </div>
                    <div className="preview-actions">
                      <button 
                        className="btn" 
                        onClick={() => downloadBase64(logoResults.ico, 'favicon.ico')}
                      >
                        Download
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => copyToClipboard(logoResults.ico)}
                      >
                        Copy Base64
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className={`tab-content ${activeTab === 'headshot' ? 'active' : ''}`}>
              <div className="card">
                <h2>Headshot Processor</h2>
                <p>Upload a headshot to process it with the following requirements:</p>
                <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                  <li>Aspect ratio: 73:100</li>
                  <li>Minimum size: 292x400 pixels</li>
                  <li>White padding will be added to maintain the aspect ratio</li>
                </ul>
                
                <form onSubmit={handleHeadshotSubmit}>
                  <div className="form-group">
                    <label htmlFor="headshot">Select Headshot Image:</label>
                    <input 
                      type="file" 
                      id="headshot" 
                      className="form-control" 
                      accept="image/*"
                      onChange={handleHeadshotChange}
                    />
                  </div>
                  
                  {headshotFile && (
                    <div className="form-group">
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleCrop('headshot')}
                        style={{ marginRight: '10px', backgroundColor: '#6c757d' }}
                      >
                        Crop Image
                      </button>
                    </div>
                  )}
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={removeBackgroundOption}
                        onChange={(e) => setRemoveBackgroundOption(e.target.checked)}
                      />
                      Remove background
                    </label>
                    <p className="checkbox-help">
                      Attempts to remove the background from the image
                    </p>
                  </div>
                  
                  {removeBackgroundOption && (
                    <div className="form-group" style={{ marginLeft: '1.5rem' }}>
                      <label htmlFor="bgTolerance">Background Removal Tolerance:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="range" 
                          id="bgTolerance" 
                          min="10" 
                          max="100" 
                          value={bgRemovalTolerance}
                          onChange={(e) => setBgRemovalTolerance(parseInt(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span>{bgRemovalTolerance}</span>
                      </div>
                      <p className="checkbox-help">
                        Higher values remove more colors similar to the background
                      </p>
                      
                      <label htmlFor="bgColor" style={{ marginTop: '10px' }}>Background Color:</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="color" 
                          id="bgColor" 
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                        />
                        <span>{bgColor}</span>
                      </div>
                      <p className="checkbox-help">
                        Select the color to remove from the background
                      </p>
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    className="btn" 
                    disabled={loading || !headshotFile}
                  >
                    {loading ? 'Processing...' : 'Process Headshot'}
                  </button>
                </form>
              </div>
              
              {headshotResult && (
                <div className="preview-container">
                  <div className="preview-item">
                    <h3>Processed Headshot</h3>
                    <img 
                      src={headshotResult} 
                      alt="Processed Headshot" 
                      className="preview-image" 
                    />
                    <div className="preview-info">
                      Aspect ratio: 73:100, Min size: 292x400 pixels
                    </div>
                    <div className="preview-actions">
                      <button 
                        className="btn" 
                        onClick={() => downloadBase64(headshotResult, 'processed_headshot.png')}
                      >
                        Download
                      </button>
                      <button 
                        className="btn" 
                        onClick={() => copyToClipboard(headshotResult)}
                      >
                        Copy Base64
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      <footer className="footer">
        <p>Image Processor - A tool for processing images to specific formats and dimensions</p>
        <p>
          <a href="https://github.com/mikAmigo/image-processor" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
      
      <style jsx global>{`
        .cropper-modal {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .cropper-modal h2 {
          margin-bottom: 0.5rem;
        }
        
        .cropper-modal p {
          margin-bottom: 1rem;
          color: #666;
        }
      `}</style>
    </div>
  );
} 