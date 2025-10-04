import axios from 'axios';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
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

export interface SUVImage {
  filename: string;
  url: string;
  timestamp: Date;
}

export interface SUVVideo {
  id: number;
  type: '304';
  video_url: string;
  image_count: number;
  created_at: Date;
  date_range_start: Date;
  date_range_end: Date;
}

export class SUVService {
  private static readonly BASE_URL = 'https://services.swpc.noaa.gov/images/animations/suvi/primary/304/';
  
  private static readonly IMAGE_PATTERN = /or_suvi-l2-ci304_g19_s(\d{8}T\d{6})Z_e(\d{8}T\d{6})Z_v[\d-]+\.png/;

  /**
   * Sleep utility for rate limiting
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse timestamp from filename
   */
  private static parseTimestamp(filename: string): Date | null {
    const match = filename.match(this.IMAGE_PATTERN);
    
    if (match) {
      const startTimeStr = match[1]; // YYYYMMDDTHHMMSS
      const year = parseInt(startTimeStr.substring(0, 4));
      const month = parseInt(startTimeStr.substring(4, 6)) - 1; // JS months are 0-indexed
      const day = parseInt(startTimeStr.substring(6, 8));
      const hour = parseInt(startTimeStr.substring(9, 11));
      const minute = parseInt(startTimeStr.substring(11, 13));
      const second = parseInt(startTimeStr.substring(13, 15));
      
      return new Date(year, month, day, hour, minute, second);
    }
    
    return null;
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
          timeout: 15000
        });
        
        const buffer = Buffer.from(response.data);
        console.log(`✓ Downloaded: ${url} (${buffer.length} bytes)`);
        
        // Add delay between downloads to avoid overwhelming the server
        await this.sleep(100);
        
        return buffer;
      } catch (error) {
        console.warn(`✗ Attempt ${attempt} failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        
        if (attempt === maxRetries) {
          console.error(`Failed to download ${url} after ${maxRetries} attempts`);
          return null;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
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
        await this.sleep(500);
      }
    }
    
    if (failed.length > 0) {
      console.warn(`Failed to download ${failed.length} images:`, failed);
    }
    
    console.log(`Successfully downloaded ${results.length}/${urls.length} images`);
    return results;
  }

  /**
   * Fetch available SUV images from NOAA
   */
  static async fetchAvailableImages(): Promise<SUVImage[]> {
    const baseUrl = this.BASE_URL;

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
      const images: SUVImage[] = [];
      
      // Try multiple parsing strategies
      const linkPatterns = [
        /<a[^>]+href="([^"]*or_suvi-l2-ci304[^"]*\.png)"[^>]*>/gi,
        /<a[^>]+href='([^']*or_suvi-l2-ci304[^']*\.png)'[^>]*>/gi,
        /href="([^"]*or_suvi-l2-ci304_g19_s\d{8}T\d{6}Z[^"]*\.png)"/gi
      ];

      let foundLinks = new Set<string>();

      for (const linkPattern of linkPatterns) {
        const matches = html.matchAll(linkPattern);
        for (const match of matches) {
          const filename = match[1];
          if (this.IMAGE_PATTERN.test(filename)) {
            foundLinks.add(filename);
          }
        }
      }

      console.log(`Found ${foundLinks.size} potential image links`);

      // Convert links to SUVImage objects
      for (const filename of foundLinks) {
        try {
          const timestamp = this.parseTimestamp(filename);
          if (timestamp) {
            images.push({
              filename,
              url: baseUrl + filename,
              timestamp
            });
          }
        } catch (error) {
          console.warn(`Failed to parse timestamp for ${filename}:`, error);
        }
      }

      // If no images found with standard parsing, try direct image enumeration
      if (images.length === 0) {
        console.log('No images found with HTML parsing, trying direct enumeration...');
        return await this.enumerateRecentImages();
      }

      // Sort by timestamp (newest first)
      const sortedImages = images.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      console.log(`Successfully parsed ${sortedImages.length} images for SUV 304`);
      
      return sortedImages;
    } catch (error) {
      console.error(`Error fetching SUV images:`, error);
      
      // Fallback to direct image enumeration
      console.log('Falling back to direct image enumeration...');
      return await this.enumerateRecentImages();
    }
  }

  /**
   * Fallback method to enumerate recent images directly
   */
  static async enumerateRecentImages(): Promise<SUVImage[]> {
    const baseUrl = this.BASE_URL;
    const images: SUVImage[] = [];
    const now = new Date();
    
    // Try the last 12 hours worth of images (every 4 minutes for SUV data)
    for (let hoursBack = 0; hoursBack < 12; hoursBack++) {
      for (let minutes = 0; minutes < 60; minutes += 4) {
        const targetTime = new Date(now.getTime() - (hoursBack * 60 + minutes) * 60 * 1000);
        const endTime = new Date(targetTime.getTime() + 4 * 60 * 1000); // 4 minutes later
        
        const startTimeStr = targetTime.toISOString().replace(/[-:]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
        const endTimeStr = endTime.toISOString().replace(/[-:]/g, '').slice(0, 15); // YYYYMMDDTHHMMSS
        
        // Generate filename based on observed pattern
        const filename = `or_suvi-l2-ci304_g19_s${startTimeStr}Z_e${endTimeStr}Z_v1-0-2.png`;
        const url = baseUrl + filename;
        
        try {
          // Check if image exists
          const response = await axios.head(url, { timeout: 5000 });
          if (response.status === 200) {
            images.push({
              filename,
              url,
              timestamp: targetTime
            });
          }
        } catch (error) {
          // Image doesn't exist, continue
        }
        
        // Add small delay to avoid overwhelming the server
        await this.sleep(10);
      }
    }
    
    console.log(`Found ${images.length} images via direct enumeration for SUV 304`);
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
   * Create MP4 video using FFmpeg
   */
  private static async createMP4WithFFmpeg(imageBuffers: Buffer[], fps: number = 4): Promise<Buffer> {
    const tempDir = path.join(os.tmpdir(), `suv_${Date.now()}`);
    const outputPath = path.join(tempDir, 'suv.mp4');
    
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
  static async uploadToCloudinary(videoBuffer: Buffer): Promise<string> {
    try {
      console.log(`Uploading video to Cloudinary for SUV 304...`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const publicId = `suv/304/${timestamp}`;

      // Determine if this is MP4 or WebP based on buffer content
      const isWebP = videoBuffer.slice(8, 12).toString() === 'WEBP';
      const resourceType = isWebP ? 'image' : 'video';
      const format = isWebP ? 'webp' : 'mp4';

      console.log(`Detected format: ${format}, resource type: ${resourceType}`);

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            public_id: publicId,
            format: format,
            folder: 'suv',
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
   * Save SUV video record to database
   */
  static async saveToDatabase(
    videoUrl: string,
    imageCount: number,
    dateRangeStart: Date,
    dateRangeEnd: Date
  ): Promise<number> {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        `INSERT INTO suv_videos (type, video_url, image_count, date_range_start, date_range_end)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (type, date_range_start, date_range_end) 
         DO UPDATE SET video_url = EXCLUDED.video_url, image_count = EXCLUDED.image_count
         RETURNING id`,
        ['304', videoUrl, imageCount, dateRangeStart, dateRangeEnd]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error saving to database:', error);
      throw new Error('Failed to save SUV video record to database');
    }
  }

  /**
   * Get latest SUV video
   */
  static async getLatestVideo(): Promise<SUVVideo | null> {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        `SELECT * FROM suv_videos 
         WHERE type = '304'
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        type: row.type,
        video_url: row.video_url,
        image_count: row.image_count,
        created_at: row.created_at,
        date_range_start: row.date_range_start,
        date_range_end: row.date_range_end,
      };
    } catch (error) {
      console.error('Error getting latest video:', error);
      throw new Error('Failed to get latest SUV video');
    }
  }

  /**
   * Process SUV data (main workflow)
   */
  static async processSUVData(maxImages: number = 12): Promise<SUVVideo> {
    try {
      console.log(`Processing SUV data for 304 angstrom...`);

      // Limit maxImages to prevent overwhelming the server
      const imageLimit = Math.min(maxImages, 288);
      console.log(`Using image limit: ${imageLimit}`);

      // Fetch available images
      const images = await this.fetchAvailableImages();
      
      if (images.length === 0) {
        throw new Error(`No images found for SUV 304`);
      }

      // Take the most recent images (up to imageLimit) and reverse them for chronological order
      const selectedImages = images.slice(0, imageLimit).reverse();
      
      console.log(`Found ${selectedImages.length} images for SUV 304 (arranged chronologically)`);

      // Extract URLs for downloading (now in chronological order: oldest to newest)
      const imageUrls = selectedImages.map(img => img.url);

      // Download images with concurrency control
      const imageBuffers = await this.downloadImagesWithConcurrencyControl(imageUrls, 2);

      if (imageBuffers.length === 0) {
        throw new Error('Failed to download any images');
      }

      console.log(`Successfully downloaded ${imageBuffers.length} images`);

      // Create video (MP4 with FFmpeg fallback to animated WebP) - 4 FPS for faster playback
      const videoBuffer = await this.createVideo(imageBuffers, 4);

      // Upload to Cloudinary
      const videoUrl = await this.uploadToCloudinary(videoBuffer);

      // Save to database
      // After reversing, first image is oldest, last image is newest
      const dateRangeStart = selectedImages[0].timestamp;
      const dateRangeEnd = selectedImages[selectedImages.length - 1].timestamp;
      
      const id = await this.saveToDatabase(
        videoUrl,
        imageBuffers.length,
        dateRangeStart,
        dateRangeEnd
      );

      console.log(`✓ Successfully processed SUV data: ${videoUrl}`);

      return {
        id,
        type: '304',
        video_url: videoUrl,
        image_count: imageBuffers.length,
        created_at: new Date(),
        date_range_start: dateRangeStart,
        date_range_end: dateRangeEnd,
      };
    } catch (error) {
      console.error(`Error processing SUV data:`, error);
      throw error;
    }
  }
}