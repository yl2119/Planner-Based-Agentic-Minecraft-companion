import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { TaskManager } from './src/agent/task_manager.js';

function main() {
    const fakeAgent = { name: 'TestAgent' };
    fakeAgent.task_manager = new TaskManager(fakeAgent);

    const loadedTask = fakeAgent.task_manager.load();

    if (!loadedTask) {
        throw new Error(
            'No existing in-progress task found for TestAgent. Run your bridge test first to create one.'
        );
    }

    const originalTaskId = loadedTask.task_id;
    const originalCurrentStepId = loadedTask.current_step_id;

    const taskFilePath = path.join(
        '.',
        'bots',
        fakeAgent.name,
        'tasks',
        `${originalTaskId}.json`
    );

    if (!existsSync(taskFilePath)) {
        throw new Error(`Expected existing task file not found: ${taskFilePath}`);
    }

    console.log('\n=== LOADED TASK BEFORE UPDATE ===\n');
    console.log('task_id:', originalTaskId);
    console.log('current_step_id:', originalCurrentStepId);
    console.log(JSON.stringify(loadedTask, null, 2));

    if (originalCurrentStepId !== 'step_1') {
        console.log(
            `\nWarning: current step is ${originalCurrentStepId}, not step_1. ` +
            `The test will still try to complete the current step.`
        );
    }

    fakeAgent.task_manager.updateStepStatus(originalCurrentStepId, 'completed');

    const updatedTask = fakeAgent.task_manager.getCurrentTask();
    const fileTask = JSON.parse(readFileSync(taskFilePath, 'utf8'));

    console.log('\n=== UPDATED TASK ===\n');
    console.log('task_id:', updatedTask.task_id);
    console.log('current_step_id:', updatedTask.current_step_id);
    console.log(JSON.stringify(updatedTask, null, 2));

    console.log('\n=== UPDATED FILE CONTENT ===\n');
    console.log(JSON.stringify(fileTask, null, 2));

    const checks = {
        sameTaskIdInMemory: updatedTask.task_id === originalTaskId,
        sameTaskIdInFile: fileTask.task_id === originalTaskId,
        sameFilePathStillUsed: existsSync(taskFilePath),
        stepMovedForward:
            updatedTask.current_step_id !== originalCurrentStepId ||
            updatedTask.status === 'completed',
        updatedFileMatchesMemory: fileTask.current_step_id === updatedTask.current_step_id
    };

    console.log('\n=== CHECKS ===\n');
    console.log(checks);

    const allPassed = Object.values(checks).every(Boolean);
    if (!allPassed) {
        throw new Error('Existing task was not updated in-place with the same task_id');
    }

    console.log('\nTEST PASSED');
}

main();