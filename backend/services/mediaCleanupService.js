/**
 * Media Cleanup Service
 * 
 * Manual cleanup of old and unused media files
 * NOTE: Auto-delete scheduled media feature is disabled
 * Admin must manually trigger cleanup via API
 */

const Media = require('../models/Media');
const whatsappService = require('./whatsappService');

class MediaCleanupService {
  /**
   * Clean up media scheduled for deletion (MANUAL ONLY - No auto-cleanup)
   * This method is available for manual execution only
   */
  async cleanupScheduledMedia() {
    try {
      console.log('🧹 Starting scheduled media cleanup...');

      const scheduledMedia = await Media.getScheduledForDeletion();
      
      if (scheduledMedia.length === 0) {
        console.log('✅ No media scheduled for deletion');
        return { deleted: 0, failed: 0 };
      }

      console.log(`📋 Found ${scheduledMedia.length} media files scheduled for deletion`);

      let deleted = 0;
      let failed = 0;

      for (const media of scheduledMedia) {
        try {
          console.log(`   Deleting: ${media.filename} (${media.whatsappMediaId})`);
          
          // Delete from WhatsApp
          const result = await whatsappService.deleteMedia(media.whatsappMediaId);
          
          if (result.success || result.message) {
            // Mark as deleted in database
            await media.markDeleted();
            deleted++;
            console.log(`   ✅ Deleted: ${media.filename}`);
          } else {
            failed++;
            media.deleteError = result.error;
            await media.save();
            console.error(`   ❌ Failed: ${media.filename} - ${result.error}`);
          }
        } catch (error) {
          failed++;
          console.error(`   ❌ Error deleting ${media.filename}:`, error.message);
        }
      }

      console.log(`✅ Cleanup complete: ${deleted} deleted, ${failed} failed`);
      
      return { deleted, failed, total: scheduledMedia.length };
    } catch (error) {
      console.error('❌ Scheduled media cleanup error:', error);
      throw error;
    }
  }

  /**
   * Clean up unused media older than specified days
   */
  async cleanupUnusedMedia(daysOld = 30) {
    try {
      console.log(`🧹 Cleaning up unused media older than ${daysOld} days...`);

      const unusedMedia = await Media.getUnusedMedia(daysOld);
      
      if (unusedMedia.length === 0) {
        console.log('✅ No unused media found');
        return { deleted: 0, failed: 0 };
      }

      console.log(`📋 Found ${unusedMedia.length} unused media files`);

      let deleted = 0;
      let failed = 0;

      for (const media of unusedMedia) {
        try {
          console.log(`   Deleting unused: ${media.filename}`);
          
          // Delete from WhatsApp
          const result = await whatsappService.deleteMedia(media.whatsappMediaId);
          
          if (result.success || result.message) {
            await media.markDeleted();
            deleted++;
            console.log(`   ✅ Deleted: ${media.filename}`);
          } else {
            failed++;
            media.deleteError = result.error;
            await media.save();
            console.error(`   ❌ Failed: ${media.filename}`);
          }
        } catch (error) {
          failed++;
          console.error(`   ❌ Error:`, error.message);
        }
      }

      console.log(`✅ Cleanup complete: ${deleted} deleted, ${failed} failed`);
      
      return { deleted, failed, total: unusedMedia.length };
    } catch (error) {
      console.error('❌ Unused media cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const [scheduled, unused30, unused60, unused90] = await Promise.all([
        Media.countDocuments({
          status: 'active',
          autoDelete: true,
          deleteScheduledFor: { $lte: new Date() }
        }),
        Media.getUnusedMedia(30).then(m => m.length),
        Media.getUnusedMedia(60).then(m => m.length),
        Media.getUnusedMedia(90).then(m => m.length)
      ]);

      return {
        scheduledForDeletion: scheduled,
        unusedMedia: {
          '30days': unused30,
          '60days': unused60,
          '90days': unused90
        }
      };
    } catch (error) {
      console.error('❌ Get cleanup stats error:', error);
      throw error;
    }
  }

  /**
   * Run full cleanup (scheduled + unused)
   */
  async runFullCleanup(unusedDaysThreshold = 60) {
    try {
      console.log('🧹 Starting full media cleanup...');

      const scheduledResult = await this.cleanupScheduledMedia();
      const unusedResult = await this.cleanupUnusedMedia(unusedDaysThreshold);

      const totalDeleted = scheduledResult.deleted + unusedResult.deleted;
      const totalFailed = scheduledResult.failed + unusedResult.failed;

      console.log('✅ Full cleanup complete');
      console.log(`   Total deleted: ${totalDeleted}`);
      console.log(`   Total failed: ${totalFailed}`);

      return {
        scheduled: scheduledResult,
        unused: unusedResult,
        summary: {
          totalDeleted,
          totalFailed
        }
      };
    } catch (error) {
      console.error('❌ Full cleanup error:', error);
      throw error;
    }
  }
}

module.exports = new MediaCleanupService();
