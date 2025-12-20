/**
 * Migration Script: Fix Message Direction Values
 * 
 * Updates all existing messages from 'incoming'/'outgoing' to 'in'/'out'
 * to match the Conversation schema enum values.
 * 
 * Run with: node src/scripts/migrateMessageDirections.js
 */

const mongoose = require('mongoose');
const Conversation = require('../core/database/models/Conversation');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-business';

async function migrateMessageDirections() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Finding conversations with invalid message directions...');
    
    // Update all messages with direction 'incoming' to 'in'
    const incomingResult = await Conversation.updateMany(
      { 'messages.direction': 'incoming' },
      { $set: { 'messages.$[elem].direction': 'in' } },
      { arrayFilters: [{ 'elem.direction': 'incoming' }] }
    );

    console.log(`✅ Updated ${incomingResult.modifiedCount} conversations with 'incoming' messages`);

    // Update all messages with direction 'outgoing' to 'out'
    const outgoingResult = await Conversation.updateMany(
      { 'messages.direction': 'outgoing' },
      { $set: { 'messages.$[elem].direction': 'out' } },
      { arrayFilters: [{ 'elem.direction': 'outgoing' }] }
    );

    console.log(`✅ Updated ${outgoingResult.modifiedCount} conversations with 'outgoing' messages`);

    // Update lastMessage direction in conversations
    console.log('\n📊 Fixing lastMessage directions...');
    
    const lastMessageIncoming = await Conversation.updateMany(
      { 'lastMessage.direction': 'incoming' },
      { $set: { 'lastMessage.direction': 'in' } }
    );

    console.log(`✅ Updated ${lastMessageIncoming.modifiedCount} conversations with lastMessage direction 'incoming'`);

    const lastMessageOutgoing = await Conversation.updateMany(
      { 'lastMessage.direction': 'outgoing' },
      { $set: { 'lastMessage.direction': 'out' } }
    );

    console.log(`✅ Updated ${lastMessageOutgoing.modifiedCount} conversations with lastMessage direction 'outgoing'`);

    // Update reaction directions
    console.log('\n📊 Fixing reaction directions...');
    
    const reactionsIncoming = await Conversation.updateMany(
      { 'messages.reactions.direction': 'incoming' },
      { $set: { 'messages.$[].reactions.$[react].direction': 'in' } },
      { arrayFilters: [{ 'react.direction': 'incoming' }] }
    );

    console.log(`✅ Updated ${reactionsIncoming.modifiedCount} conversations with 'incoming' reactions`);

    const reactionsOutgoing = await Conversation.updateMany(
      { 'messages.reactions.direction': 'outgoing' },
      { $set: { 'messages.$[].reactions.$[react].direction': 'out' } },
      { arrayFilters: [{ 'react.direction': 'outgoing' }] }
    );

    console.log(`✅ Updated ${reactionsOutgoing.modifiedCount} conversations with 'outgoing' reactions`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Conversations with incoming messages: ${incomingResult.modifiedCount}`);
    console.log(`   - Conversations with outgoing messages: ${outgoingResult.modifiedCount}`);
    console.log(`   - LastMessage incoming: ${lastMessageIncoming.modifiedCount}`);
    console.log(`   - LastMessage outgoing: ${lastMessageOutgoing.modifiedCount}`);
    console.log(`   - Reactions incoming: ${reactionsIncoming.modifiedCount}`);
    console.log(`   - Reactions outgoing: ${reactionsOutgoing.modifiedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateMessageDirections();
