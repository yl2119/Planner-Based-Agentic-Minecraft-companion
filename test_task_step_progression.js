import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { TaskManager } from './src/agent/task_manager.js';

function main() {
    const fakeAgent = { name: 'TestAgentProgress' };
    fakeAgent.task_manager = new TaskManager(fakeAgent);

    const task = fakeAgent.task_manager.createTask(
        'Collect 5 chickens and bring them back to base',
        [
            { description: 'Find chickens nearby' },
            { description: 'Collect 5 chickens' },
            { description: 'Return to base' }
        ]
    );

    const taskFilePath = path.join(
        '.',
        'bots',
        fakeAgent.name,
        'tasks',
        `${task.task_id}.json`
    );

    if (!existsSync(taskFilePath)) {
        throw new Error(`Task file was not created at ${taskFilePath}`);
    }

    console.log('\n=== BEFORE COMPLETING STEP 1 ===\n');
    console.log(JSON.stringify(fakeAgent.task_manager.getCurrentTask(), null, 2));

    fakeAgent.task_manager.updateStepStatus('step_1', 'completed');

    const currentTask = fakeAgent.task_manager.getCurrentTask();
    const fileTask = JSON.parse(readFileSync(taskFilePath, 'utf8'));

    console.log('\n=== AFTER COMPLETING STEP 1 ===\n');
    console.log(JSON.stringify(currentTask, null, 2));

    console.log('\n=== SAVED TASK FILE AFTER UPDATE ===\n');
    console.log(JSON.stringify(fileTask, null, 2));

    const step1 = currentTask.steps.find(step => step.step_id === 'step_1');
    const step2 = currentTask.steps.find(step => step.step_id === 'step_2');
    const step3 = currentTask.steps.find(step => step.step_id === 'step_3');

    const checks = {
        step1Completed: step1?.status === 'completed',
        step2InProgress: step2?.status === 'in_progress',
        step3StillPending: step3?.status === 'pending',
        currentStepMoved: currentTask.current_step_id === 'step_2',
        sameTaskFileUpdated: fileTask.current_step_id === 'step_2'
    };

    console.log('\n=== CHECKS ===\n');
    console.log(checks);

    const allPassed = Object.values(checks).every(Boolean);
    if (!allPassed) {
        throw new Error('Step progression test failed');
    }

    console.log('\nTEST PASSED');
}

main();