# Image Processor

A web application for processing images to specific formats and dimensions. This tool helps you prepare images for various platforms and requirements.

## Features

### Logo Processor
- Convert logos to PNG format
- Create rectangular logos with 5:2 aspect ratio (minimum 400x160 pixels)
- Create square logos with 1:1 aspect ratio (minimum 40x40 pixels)
- Generate ICO files for favicons (with sizes 40x40, 48x48, 64x64 pixels)
- Option to use transparent background instead of white
- Get base64 encoded versions of all processed images

### Headshot Processor
- Convert headshots to PNG format
- Ensure exact 73:100 aspect ratio by adding white padding
- Ensure minimum size of 292x400 pixels
- Get base64 encoded versions of processed headshots

## Technologies Used

- Next.js
- React
- HTML5 Canvas API
- CSS3

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/image-processor.git
   cd image-processor
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

### Deploying to Vercel

1. Push your code to a GitHub repository.

2. Visit [Vercel](https://vercel.com) and sign up or log in.

3. Click "New Project" and import your GitHub repository.

4. Configure the project settings if needed and click "Deploy".

### Deploying to GitHub Pages

1. Install the gh-pages package:
   ```
   npm install --save-dev gh-pages
   # or
   yarn add --dev gh-pages
   ```

2. Add the following to your `package.json`:
   ```json
   "scripts": {
     "build": "next build && next export",
     "export": "next export",
     "deploy": "next build && next export && touch out/.nojekyll && gh-pages -d out -t true"
   },
   "homepage": "https://yourusername.github.io/image-processor"
   ```

3. Deploy to GitHub Pages:
   ```
   npm run deploy
   # or
   yarn deploy
   ```

## Usage

1. Select the tab for the type of image you want to process (Logo or Headshot).

2. Upload your image using the file input.

3. Click the "Process" button to generate the processed image(s).

4. View the results, download the processed images, or copy the base64 encoded strings.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the need for consistent image formatting across different platforms
- Built with Next.js and React 