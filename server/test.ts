import { db } from './db';
import { tasks, customFields } from '@shared/schema';
import { eq } from 'drizzle-orm';

// This is a minimal test script to directly test customData operations with PostgreSQL
async function testCustomDataOperations() {
  try {
    console.log('Starting custom data test...');
    
    // 1. Create a custom field for testing
    console.log('Creating a test custom field...');
    const [testField] = await db.insert(customFields).values({
      name: 'TestField',
      type: 'text',
      boardId: 1
    }).returning();
    
    console.log('Created custom field:', testField);
    
    // 2. Create a test task with custom data
    console.log('Creating a test task with custom data...');
    const [testTask] = await db.insert(tasks).values({
      title: 'Test Task',
      description: 'This is a test task to verify custom data handling',
      categoryId: 1,
      customData: { [testField.name]: 'Test value' }
    }).returning();
    
    console.log('Created test task with custom data:', testTask);
    
    // 3. Update the task to remove the custom field
    console.log('Updating task to remove custom field...');
    const [updatedTask] = await db.update(tasks)
      .set({ 
        customData: {} 
      })
      .where(eq(tasks.id, testTask.id))
      .returning();
    
    console.log('Task updated with empty customData:', updatedTask);
    
    // 4. Verify the data in the database
    const [finalTask] = await db.select().from(tasks).where(eq(tasks.id, testTask.id));
    console.log('Final task state in database:', finalTask);
    console.log('Final customData:', finalTask.customData);
    
    // 5. Clean up - delete the test data
    await db.delete(tasks).where(eq(tasks.id, testTask.id));
    await db.delete(customFields).where(eq(customFields.id, testField.id));
    
    console.log('Test completed and cleanup done.');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Execute the test
testCustomDataOperations().then(() => {
  console.log('Test script execution completed');
  process.exit(0);
});