import { MemoryController } from '../lib/controllers/memory_controller';

describe('MemoryController', () => {
  let memoryController: MemoryController;

  beforeEach(() => {
    memoryController = new MemoryController();
  });

  test('should initialize correctly', () => {
    expect(memoryController).toBeDefined();
  });

  test('should return empty history for new thread', async () => {
    const history = await memoryController.getConversationHistory('new-thread');
    expect(history).toEqual([]);
  });

  test('should compile workflow', () => {
    const mockCallModel = jest.fn();
    const workflow = memoryController.compileWorkflow(mockCallModel);
    
    expect(workflow).toBeDefined();
    expect(typeof workflow.invoke).toBe('function');
  });
});