import axios from 'axios';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
// Use CommonJS require to avoid TS type issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GIFEncoder = require('gif-encoder-2');
import { getPool } from '../models/database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ffmpegStatic from 'ffmpeg-static';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface AuroraImage {
  filename: string;
  url: string;
  timestamp: Date;
}

export interface AuroraVideo {
  id: number;
  hemisphere: 'north' | 'south';
  video_url: string;
  image_count: number;
  created_at: Date;
  date_range_start: Date;
  date_range_end: Date;
}

export class AuroraService {
  private static readonly BASE_URLS = {
    north: 'https://services.swpc.noaa.gov/images/animations/ovation/north/',
    south: 'https://services.swpc.noaa.gov/images/animations/ovation/south/',
  };

  private static readonly IMAGE_PATTERN = {
    north: /aurora_N_(\d{4}-\d{2}-\d{2}_\d{4})\.jpg/,
    south: /aurora_S_(\d{4}-\d{2}-\d{2}_\d{4})\.jpg/,
  };

  /**
   * Sleep utility for rate limiting
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Download image with retry logic and rate limiting
   */
  static async downloadImageWithRetry(url: string, maxRetries: number = 3): Promise<Buffer | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Downloading image (attempt ${attempt}): ${url}`);
        
        const response = await axios.get(url, { 
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 15000 // Reduced timeout
        });
        
        const buffer = Buffer.from(response.data);
        console.log(`✓ Downloaded: ${url} (${buffer.length} bytes)`);
        
        // Add delay between downloads to avoid overwhelming the server
        await this.sleep(50); // 100ms delay
        
        return buffer;
      } catch (error) {
        console.warn(`✗ Attempt ${attempt} failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (attempt === maxRetries) {
          console.error(`Failed to download ${url} after ${maxRetries} attempts`);
          return null;
        }
        
        // Exponential backoff
        const delay = Math.min(500 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    return null;
  }

  /**
   * Download multiple images with concurrency control
   */
  static async downloadImagesWithConcurrencyControl(urls: string[], maxConcurrent: number = 3): Promise<Buffer[]> {
    const results: Buffer[] = [];
    const failed: string[] = [];
    
    // Process images in batches to control concurrency
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      console.log(`Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)} (${batch.length} images)`);
      
      const batchPromises = batch.map(url => this.downloadImageWithRetry(url));
      const batchResults = await Promise.all(batchPromises);
      
      // Filter out failed downloads
      for (let j = 0; j < batchResults.length; j++) {
        const buffer = batchResults[j];
        if (buffer) {
          results.push(buffer);
        } else {
          failed.push(batch[j]);
        }
      }
      
      // Add delay between batches
      if (i + maxConcurrent < urls.length) {
        await this.sleep(500); // 500ms delay between batches
      }
    }
    
    if (failed.length > 0) {
      console.warn(`Failed to download ${failed.length} images:`, failed);
    }
    
    console.log(`Successfully downloaded ${results.length}/${urls.length} images`);
    return results;
  }

  /**
   * Fetch available aurora images from NOAA for a specific hemisphere
   */
  static async fetchAvailableImages(hemisphere: 'north' | 'south'): Promise<AuroraImage[]> {
    const baseUrl = this.BASE_URLS[hemisphere];
    const pattern = this.IMAGE_PATTERN[hemisphere];

    try {
      console.log(`Fetching image list from: ${baseUrl}`);
      
      const response = await axios.get(baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });
      
      const html = response.data;
      console.log(`Received HTML response (${html.length} characters)`);

      // Parse HTML to extract image links
      const images: AuroraImage[] = [];
      
      // Try multiple parsing strategies
      const linkPatterns = [
        /<a[^>]+href="([^"]*aurora_[NS]_[^"]*\.jpg)"[^>]*>/gi,
        /<a[^>]+href='([^']*aurora_[NS]_[^']*\.jpg)'[^>]*>/gi,
        /href="([^"]*aurora_[NS]_\d{4}-\d{2}-\d{2}_\d{4}\.jpg)"/gi
      ];

      let foundLinks = new Set<string>();

      for (const linkPattern of linkPatterns) {
        const matches = html.matchAll(linkPattern);
        for (const match of matches) {
          const filename = match[1];
          if (pattern.test(filename)) {
            foundLinks.add(filename);
          }
        }
      }

      console.log(`Found ${foundLinks.size} potential image links`);

      // Convert links to AuroraImage objects
      for (const filename of foundLinks) {
        try {
          // Extract timestamp from filename
          const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}_\d{4})/);
          if (timestampMatch) {
            const dateTimeStr = timestampMatch[1];
            const [datePart, timePart] = dateTimeStr.split('_');
            const timestamp = new Date(`${datePart}T${timePart.slice(0,2)}:${timePart.slice(2)}:00Z`);
            
            images.push({
              filename,
              url: baseUrl + filename,
              timestamp,
            });
          }
        } catch (error) {
          console.warn(`Failed to parse timestamp for ${filename}:`, error);
        }
      }

      // If no images found with standard parsing, try direct image enumeration
      if (images.length === 0) {
        console.log('No images found with HTML parsing, trying direct enumeration...');
        return await this.enumerateRecentImages(hemisphere);
      }

      // Sort by timestamp (newest first)
      const sortedImages = images.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      console.log(`Successfully parsed ${sortedImages.length} images for ${hemisphere} hemisphere`);
      
      return sortedImages;
    } catch (error) {
      console.error(`Error fetching images for ${hemisphere}:`, error);
      
      // Fallback to direct image enumeration
      console.log('Falling back to direct image enumeration...');
      return await this.enumerateRecentImages(hemisphere);
    }
  }

  /**
   * Fallback method to enumerate recent images directly
   */
  static async enumerateRecentImages(hemisphere: 'north' | 'south'): Promise<AuroraImage[]> {
    const baseUrl = this.BASE_URLS[hemisphere];
    const images: AuroraImage[] = [];
    const now = new Date();
    
    // Try the last 12 hours worth of images (every 5 minutes) - reduced scope
    for (let hoursBack = 0; hoursBack < 12; hoursBack++) {
      for (let minutes = 0; minutes < 60; minutes += 5) {
        const targetTime = new Date(now.getTime() - (hoursBack * 60 + minutes) * 60 * 1000);
        const dateStr = targetTime.toISOString().slice(0, 10); // YYYY-MM-DD
        const timeStr = targetTime.toISOString().slice(11, 16).replace(':', ''); // HHMM
        
        const hemisphereCode = hemisphere === 'north' ? 'N' : 'S';
        const filename = `aurora_${hemisphereCode}_${dateStr}_${timeStr}.jpg`;
        const url = baseUrl + filename;
        
        try {
          // Check if image exists
          const response = await axios.head(url, { timeout: 5000 });
          if (response.status === 200) {
            images.push({
              filename,
              url,
              timestamp: targetTime,
            });
          }
        } catch (error) {
          // Image doesn't exist, continue
        }
        
        // Add small delay to avoid overwhelming the server
        await this.sleep(10);
      }
    }
    
    console.log(`Found ${images.length} images via direct enumeration for ${hemisphere}`);
    return images.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Create video from multiple images - MP4 with FFmpeg fallback to animated WebP
   * Images should be provided in chronological order (oldest to newest)
   */
  static async createVideo(imageBuffers: Buffer[], fps: number = 4): Promise<Buffer> {
    // First try FFmpeg for MP4
    try {
      return await this.createMP4WithFFmpeg(imageBuffers, fps);
    } catch (error) {
      console.warn('FFmpeg failed, falling back to animated WebP:', error instanceof Error ? error.message : 'Unknown error');
      return await this.createAnimatedWebP(imageBuffers, fps);
    }
  }

  /**
   * Create an MP4 by offloading composition to Cloudinary:
   * 1) Upload frames as images under a unique prefix
   * 2) Use Cloudinary's multi API to assemble an animated GIF
   * 3) Return an MP4 delivery URL for the created asset
   *
   * This path avoids local ffmpeg entirely and is stable on serverless (Vercel).
   */
  private static async createGifLocally(imageBuffers: Buffer[], fps: number = 4): Promise<Buffer> {
    // Prepare consistent frame size via sharp (e.g., 512x512) and get RGBA raw buffers
    const width = 512;
    const height = 512;
    const processed: Buffer[] = [];
    for (const buf of imageBuffers) {
      const rgba = await sharp(buf)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
        .raw()
        .ensureAlpha()
        .toBuffer();
      processed.push(rgba);
    }

    const delayMs = Math.round(1000 / fps);
    const encoder = new GIFEncoder(width, height);
    encoder.setDelay(delayMs);
    encoder.setRepeat(0); // loop forever
    encoder.setQuality(10); // 1-best, 20-fast; 10 is reasonable
  // Do not set a transparent color; keep backgrounds opaque

    encoder.start();
    for (const frame of processed) {
      encoder.addFrame(frame);
    }
    encoder.finish();
    const out = (encoder as any).out?.getData?.() ?? null;
    const gifBuffer: Buffer = Buffer.isBuffer(out) ? out : out ? Buffer.from(out) : Buffer.alloc(0);
    if (!gifBuffer || gifBuffer.length === 0) {
      throw new Error('GIF encoding produced an empty buffer');
    }
    return gifBuffer;
  }

  /**
   * Create MP4 video using FFmpeg
   */
  private static async createMP4WithFFmpeg(imageBuffers: Buffer[], fps: number = 4): Promise<Buffer> {
    const tempDir = path.join(os.tmpdir(), `aurora_${Date.now()}`);
    const outputPath = path.join(tempDir, 'aurora.mp4');
    try {
      console.log(`Creating MP4 from ${imageBuffers.length} images using FFmpeg...`);
      
      // Create temporary directory
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Save all images as temporary files
      const imagePaths: string[] = [];
      for (let i = 0; i < imageBuffers.length; i++) {
        const imagePath = path.join(tempDir, `frame_${i.toString().padStart(4, '0')}.png`);
        
        // Process and save image
        await sharp(imageBuffers[i])
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
          .png()
          .toFile(imagePath);
        
        imagePaths.push(imagePath);
      }
      
      console.log(`Creating MP4 with ${imagePaths.length} frames at ${fps} FPS...`);
      
      // Get the correct ffmpeg path
      let ffmpegPath: string;
      
      if (typeof ffmpegStatic === 'string') {
        ffmpegPath = ffmpegStatic;
      } else if (ffmpegStatic && typeof ffmpegStatic === 'object' && 'path' in ffmpegStatic) {
        ffmpegPath = (ffmpegStatic as any).path;
      } else if (ffmpegStatic) {
        // Handle default export case
        ffmpegPath = String(ffmpegStatic.default || ffmpegStatic);
      } else {
        throw new Error('FFmpeg static binary not found');
      }
      
      // Verify FFmpeg path exists
      if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
        throw new Error(`FFmpeg binary not found at path: ${ffmpegPath}`);
      }
      
      console.log(`Using FFmpeg path: ${ffmpegPath}`);
      
      const { spawn } = require('child_process');
      
      await new Promise<void>((resolve, reject) => {
        const args = [
          '-y', // Overwrite output file
          '-framerate', fps.toString(),
          '-i', path.join(tempDir, 'frame_%04d.png'),
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-crf', '23',
          '-preset', 'medium',
          '-movflags', '+faststart', // Optimize for web streaming
          outputPath
        ];
        
        console.log(`Spawning FFmpeg with args: ${JSON.stringify(args)}`);
        
        const ffmpeg = spawn(ffmpegPath, args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stderr = '';
        let stdout = '';
        
        ffmpeg.stdout.on('data', (data: any) => {
          stdout += data.toString();
          console.log(`FFmpeg stdout: ${data}`);
        });
        
        ffmpeg.stderr.on('data', (data: any) => {
          stderr += data.toString();
          console.log(`FFmpeg stderr: ${data}`);
        });
        
        ffmpeg.on('close', (code: any) => {
          console.log(`FFmpeg process exited with code ${code}`);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`FFmpeg process exited with code ${code}. Stderr: ${stderr}`));
          }
        });
        
        ffmpeg.on('error', (error: any) => {
          console.error(`FFmpeg spawn error:`, error);
          reject(new Error(`Failed to spawn FFmpeg: ${error.message}`));
        });
      });
      
      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('FFmpeg did not create output file');
      }
      
      // Read the created MP4 file
      const mp4Buffer = fs.readFileSync(outputPath);
      console.log(`MP4 file size: ${mp4Buffer.length} bytes`);
      
      // Clean up temporary files
      for (const imagePath of imagePaths) {
        try {
          fs.unlinkSync(imagePath);
        } catch (e) {
          console.warn(`Failed to delete temporary image: ${imagePath}`);
        }
      }
      
      try {
        fs.unlinkSync(outputPath);
        fs.rmdirSync(tempDir);
      } catch (e) {
        console.warn(`Failed to clean up temporary directory: ${tempDir}`);
      }
      
      console.log(`✓ MP4 created successfully (${mp4Buffer.length} bytes)`);
      return mp4Buffer;
      
    } catch (error) {
      console.error('Error creating MP4 video:', error);
      
      // Clean up on error
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn(`Failed to clean up on error: ${tempDir}`);
      }
      
      throw error;
    }
  }

  /**
   * Create animated WebP as fallback when FFmpeg is not available
   */
  private static async createAnimatedWebP(imageBuffers: Buffer[], fps: number = 4): Promise<Buffer> {
    try {
      console.log(`Creating animated WebP from ${imageBuffers.length} images at ${fps} FPS...`);
      
      // Calculate delay between frames (in milliseconds)
      const delay = Math.round(1000 / fps);
      
      // Process and resize all images first
      const processedImages: Buffer[] = [];
      for (let i = 0; i < imageBuffers.length; i++) {
        const processed = await sharp(imageBuffers[i])
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
          .png() // Convert to PNG first for consistency
          .toBuffer();
        processedImages.push(processed);
      }
      
      console.log(`Processed ${processedImages.length} images, creating animated WebP...`);
      
      // Sharp doesn't have built-in animated WebP support, so we'll create a simpler fallback
      // For now, let's just return the first image as a static WebP
      // In a real implementation, you might want to use a different library for animated WebP
      const staticWebP = await sharp(processedImages[0])
        .webp({ 
          quality: 80,
          effort: 4
        })
        .toBuffer();
      
      console.log(`✓ Static WebP created as fallback (${staticWebP.length} bytes)`);
      console.log(`Note: Animated WebP requires additional libraries. Using static image as fallback.`);
      
      return staticWebP;
      
    } catch (error) {
      console.error('Error creating WebP:', error);
      throw new Error(`Failed to create WebP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload video to Cloudinary
   */
  static async uploadToCloudinary(videoBuffer: Buffer, hemisphere: 'north' | 'south'): Promise<string> {
    try {
      console.log(`Uploading video to Cloudinary for ${hemisphere} hemisphere...`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const publicId = `aurora/${hemisphere}/${timestamp}`;

  // Detect common formats by magic bytes. If neither mp4/webp, treat as gif
  const isWebP = videoBuffer.slice(8, 12).toString() === 'WEBP';
  const isMp4 = videoBuffer.slice(4, 8).toString() === 'ftyp';
  const isGif = videoBuffer.slice(0, 4).toString() === 'GIF8';
  const resourceType = isMp4 ? 'video' : 'image';
  const format = isGif ? 'gif' : isWebP ? 'webp' : isMp4 ? 'mp4' : 'gif';

      console.log(`Detected format: ${format}, resource type: ${resourceType}`);

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            public_id: publicId,
            format: format,
            folder: 'aurora',
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(videoBuffer);
      });

      console.log(`✓ Video uploaded successfully: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload video to Cloudinary');
    }
  }

  /**
   * Save aurora video record to database
   */
  static async saveToDatabase(
    hemisphere: 'north' | 'south',
    videoUrl: string,
    imageCount: number,
    dateRangeStart: Date,
    dateRangeEnd: Date
  ): Promise<number> {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        `INSERT INTO aurora_videos (hemisphere, video_url, image_count, date_range_start, date_range_end)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (hemisphere, date_range_start, date_range_end) 
         DO UPDATE SET video_url = EXCLUDED.video_url, image_count = EXCLUDED.image_count
         RETURNING id`,
        [hemisphere, videoUrl, imageCount, dateRangeStart, dateRangeEnd]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving to database:', error);
      throw new Error('Failed to save aurora video record to database');
    }
  }

  /**
   * Get latest aurora video for a hemisphere
   */
  static async getLatestVideo(hemisphere: 'north' | 'south'): Promise<AuroraVideo | null> {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        `SELECT * FROM aurora_videos 
         WHERE hemisphere = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [hemisphere]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        hemisphere: row.hemisphere,
        video_url: row.video_url,
        image_count: row.image_count,
        created_at: row.created_at,
        date_range_start: row.date_range_start,
        date_range_end: row.date_range_end,
      };
    } catch (error) {
      console.error('Error getting latest video:', error);
      throw new Error('Failed to get latest aurora video');
    }
  }

  /**
   * Process aurora data for a hemisphere (main workflow)
   */
  static async processAuroraData(hemisphere: 'north' | 'south', maxImages: number = 12): Promise<AuroraVideo> {
    try {
      console.log(`Processing aurora data for ${hemisphere} hemisphere...`);

      // Limit maxImages to prevent overwhelming the server
      const imageLimit = Math.min(maxImages, 288); // Cap at 288 images
      console.log(`Using image limit: ${imageLimit}`);

      // Fetch available images
      const images = await this.fetchAvailableImages(hemisphere);
      
      if (images.length === 0) {
        throw new Error(`No images found for ${hemisphere} hemisphere`);
      }

      // Take the most recent images (up to imageLimit) and reverse them for chronological order
      const selectedImages = images.slice(0, imageLimit).reverse();
      
      console.log(`Found ${selectedImages.length} images for ${hemisphere} hemisphere (arranged chronologically)`);

      // Extract URLs for downloading (now in chronological order: oldest to newest)
      const imageUrls = selectedImages.map(img => img.url);

      // Download images with concurrency control
      const imageBuffers = await this.downloadImagesWithConcurrencyControl(imageUrls, 2); // Max 2 concurrent downloads

      if (imageBuffers.length === 0) {
        throw new Error('Failed to download any images');
      }

      console.log(`Successfully downloaded ${imageBuffers.length} images`);

  // Create GIF locally and upload to Cloudinary as image/gif
  const gifBuffer = await this.createGifLocally(imageBuffers, 4);
  const videoUrl = await this.uploadToCloudinary(gifBuffer, hemisphere);

      // Save to database
      // After reversing, first image is oldest, last image is newest
      const dateRangeStart = selectedImages[0].timestamp;
      const dateRangeEnd = selectedImages[selectedImages.length - 1].timestamp;
      
      const id = await this.saveToDatabase(
        hemisphere,
        videoUrl,
        imageBuffers.length,
        dateRangeStart,
        dateRangeEnd
      );

      console.log(`✓ Successfully processed aurora data for ${hemisphere}: ${videoUrl}`);

      return {
        id,
        hemisphere,
        video_url: videoUrl,
        image_count: imageBuffers.length,
        created_at: new Date(),
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
      };
    } catch (error) {
      console.error(`Error processing aurora data for ${hemisphere}:`, error);
      throw error;
    }
  }
}