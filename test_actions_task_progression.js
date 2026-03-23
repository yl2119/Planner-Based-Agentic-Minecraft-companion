import { TaskManager } from './src/agent/task_manager.js';

function applyTaskUpdate(agent, actionLabel, code_return) {
    const currentTask = agent.task_manager?.getCurrentTask();
    const currentStep = agent.task_manager?.getCurrentStep();

    const taskRelevantActions = new Set([
        'goToPlayer',
        'goToCoordinates',
        'searchForBlock',
        'searchForEntity',
        'collectBlocks',
        'craftRecipe',
        'smeltItem',
        'attack',
        'goToRoom',
        'goToBed',
        'digDown',
        'goToSurface',
        'useOn'
    ]);

    if (
        taskRelevantActions.has(actionLabel) &&
        currentTask &&
        currentStep &&
        currentTask.status === 'in_progress'
    ) {
        if (code_return.success) {
            agent.task_manager.updateStepStatus(currentStep.step_id, 'completed');
        } else if (code_return.timedout) {
            agent.task_manager.blockStep(currentStep.step_id);
        } else if (!code_return.interrupted) {
            agent.task_manager.recordStepFailure(currentStep.step_id);
        }
    }
}

function main() {
    const fakeAgent = { name: 'TestActionProgress' };
    fakeAgent.task_manager = new TaskManager(fakeAgent);

    fakeAgent.task_manager.createTask(
        'Collect 5 chickens and bring them back to base',
        [
            { description: 'Find chickens nearby' },
            { description: 'Collect 5 chickens' },
            { description: 'Return to base' }
        ]
    );

    console.log('\n=== BEFORE SUCCESS ACTION ===\n');
    console.log(JSON.stringify(fakeAgent.task_manager.getCurrentTask(), null, 2));

    applyTaskUpdate(fakeAgent, 'collectBlocks', {
        success: true,
        timedout: false,
        interrupted: false,
        message: 'ok'
    });

    const taskAfterSuccess = fakeAgent.task_manager.getCurrentTask();

    console.log('\n=== AFTER SUCCESS ACTION ===\n');
    console.log(JSON.stringify(taskAfterSuccess, null, 2));

    const successChecks = {
        step1Completed: taskAfterSuccess.steps.find(s => s.step_id === 'step_1')?.status === 'completed',
        step2InProgress: taskAfterSuccess.steps.find(s => s.step_id === 'step_2')?.status === 'in_progress',
        currentStepMoved: taskAfterSuccess.current_step_id === 'step_2'
    };

    console.log('\n=== SUCCESS CHECKS ===\n');
    console.log(successChecks);

    if (!Object.values(successChecks).every(Boolean)) {
        throw new Error('Success progression failed');
    }

    applyTaskUpdate(fakeAgent, 'collectBlocks', {
        success: false,
        timedout: false,
        interrupted: false,
        message: 'failed'
    });

    const taskAfterFail = fakeAgent.task_manager.getCurrentTask();

    console.log('\n=== AFTER FAILURE ACTION ===\n');
    console.log(JSON.stringify(taskAfterFail, null, 2));

    const failChecks = {
        step2Failed: taskAfterFail.steps.find(s => s.step_id === 'step_2')?.status === 'failed',
        currentStepStillStep2: taskAfterFail.current_step_id === 'step_2'
    };

    console.log('\n=== FAILURE CHECKS ===\n');
    console.log(failChecks);

    if (!Object.values(failChecks).every(Boolean)) {
        throw new Error('Failure update failed');
    }

    console.log('\nTEST PASSED');
}

main();