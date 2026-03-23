import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { TaskManager } from './src/agent/task_manager.js';
import { createTaskFromPlan } from './src/agent/library/skills.js';

function main() {
    const fakeAgent = { name: 'TestAgent' };
    fakeAgent.task_manager = new TaskManager(fakeAgent);

    const tasksDir = path.join('.', 'bots', fakeAgent.name, 'tasks');

    // optional cleanup of old fallback file if it exists
    const oldCurrentTaskPath = path.join(tasksDir, 'current_task.json');
    if (existsSync(oldCurrentTaskPath)) {
        rmSync(oldCurrentTaskPath, { force: true });
    }

    const fakePlanResult = {
        steps: [
            { description: 'Find chickens nearby' },
            { description: 'Collect 5 chickens' },
            { description: 'Return to base' }
        ]
    };

    const task = createTaskFromPlan(
        fakeAgent.task_manager,
        fakePlanResult,
        'Collect 5 chickens and bring them back to base',
        'chicken',
        5
    );

    const currentTask = fakeAgent.task_manager.getCurrentTask();

    if (!currentTask) {
        throw new Error('No current task after createTaskFromPlan');
    }

    const taskFilePath = path.join(
        '.',
        'bots',
        fakeAgent.name,
        'tasks',
        `${currentTask.task_id}.json`
    );

    if (!existsSync(taskFilePath)) {
        throw new Error(`Task file was not created at ${taskFilePath}`);
    }

    const fileTask = JSON.parse(readFileSync(taskFilePath, 'utf8'));

    const forbiddenFields = ['retry_count', 'last_failure_reason', 'last_attempt_at'];
    const badSteps = currentTask.steps.filter(step =>
        forbiddenFields.some(field => Object.prototype.hasOwnProperty.call(step, field))
    );

    console.log('\n=== CURRENT TASK ===\n');
    console.log(JSON.stringify(currentTask, null, 2));

    console.log('\n=== SAVED TASK FILE ===\n');
    console.log(taskFilePath);
    console.log(JSON.stringify(fileTask, null, 2));

    if (task.task_id !== currentTask.task_id) {
        throw new Error('Returned task does not match current task');
    }

    if (fileTask.task_id !== currentTask.task_id) {
        throw new Error('Saved task does not match current task');
    }

    if (badSteps.length > 0) {
        throw new Error('Forbidden step fields still exist');
    }

    console.log('\nTEST PASSED');
}

main();