const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Compresses an MP4 video using FFmpeg.
 * This function resolves with the path to the compressed video.
 * 
 * @param {string} inputPath - The absolute or relative path to the original uploaded video.
 * @param {string} outputPath - The path where the compressed video should be saved.
 * @returns {Promise<string>} A promise that resolves with the output path upon success.
 */
const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Ensure input file exists
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Input file not found at ${inputPath}`));
    }

    // Spawn FFmpeg process
    // -y: Overwrite output files without asking
    // -i: Input file
    // -vcodec libx264: Use H.264 video codec
    // -crf 24: Constant Rate Factor (24 provides excellent quality while drastically reducing size)
    // -preset fast: Balance between compression efficiency and encoding speed
    // -movflags +faststart: Moves the moov atom to the front for instant streaming/playback (Critical for mobile)
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vcodec', 'libx264',
      '-crf', '24',
      '-preset', 'fast',
      '-movflags', '+faststart',
      outputPath
    ]);

    // Optional: Log errors if any
    ffmpeg.stderr.on('data', (data) => {
      // ffmpeg logs its progress to stderr
      console.log(`FFmpeg: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
};

module.exports = { compressVideo };
