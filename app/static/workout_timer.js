// DOM elements
const elements = {
    restInput: document.getElementById('rest'),
    intervalInput: document.getElementById('interval'),
    setsInput: document.getElementById('sets'),
    exerciseNameInput: document.getElementById('exercise-name'),
    repsInput: document.getElementById('reps'),
    addWorkoutBtn: document.getElementById('add-workout'),
    workoutList: document.getElementById('workout-list'),
    timerDisplay: document.getElementById('timer-display'),
    startBtn: document.getElementById('start'),
    pauseBtn: document.getElementById('pause'),
    clearWorkoutsBtn: document.getElementById('clear-workouts'),
    currentExerciseDisplay: document.getElementById('current-exercise'),
    currentSetDisplay: document.getElementById('current-set'),
    completionMessage: document.getElementById('completion-message'),
    noWorkoutsWarning: document.getElementById('no-workouts-warning'),
    workoutStateDisplay: document.getElementById('workout-state'),
};

// Constants
const WORKOUT_STATES = {
    WORKOUT: 'Workout',
    REST: 'Rest',
    COMPLETED: 'All workouts completed.',
};

// App state
let state = {
    workouts: [],
    currentWorkoutIndex: 0,
    currentSet: 1,
    isRestPeriod: false,
    timer: null,
    currentTime: 0,
    isPaused: false,
    currentTechnique: null
};

// Event listeners
elements.addWorkoutBtn.addEventListener('click', addWorkout);
elements.clearWorkoutsBtn.addEventListener('click', clearWorkouts);
elements.startBtn.addEventListener('click', startTimer);
elements.pauseBtn.addEventListener('click', pauseTimer);

function addWorkout() {
    const workout = {
        exerciseName: elements.exerciseNameInput.value.trim(),
        reps: parseInt(elements.repsInput.value),
        sets: parseInt(elements.setsInput.value),
        interval: parseInt(elements.intervalInput.value),
        rest: parseInt(elements.restInput.value),
    };

    if (isValidWorkout(workout)) {
        state.workouts.push(workout);
        displayWorkout(workout);
        elements.exerciseNameInput.value = '';
    }
}

function isValidWorkout(workout) {
    return workout.exerciseName && workout.reps && workout.sets && workout.interval && workout.rest;
}

function displayWorkout(workout) {
    const li = document.createElement('li');
    li.textContent = `${workout.exerciseName} (${workout.reps} reps) x ${workout.sets} sets - ${workout.interval}s interval - ${workout.rest}s rest`;
    li.dataset.completed = 'false';
    elements.workoutList.appendChild(li);
}

function resetDisplay() {
    clearInterval(state.timer);
    elements.timerDisplay.textContent = '00:00';
    elements.completionMessage.classList.add('d-none');
    elements.currentSetDisplay.textContent = '';
    elements.currentExerciseDisplay.textContent = '';
    elements.workoutStateDisplay.textContent = '';
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;

    // Hide technique display
    document.getElementById('current-technique-display').style.display = 'none';
}

function clearWorkouts() {
    elements.workoutList.innerHTML = '';
    state.workouts = [];
    state.currentWorkoutIndex = 0;
    state.currentSet = 1;
    state.currentTechnique = null;
    resetDisplay();
}

async function startTimer() {
    if (state.workouts.length > 0) {
        if (state.isPaused) {
            resumeTimer();
        } else {
            await initializeNewWorkout();
        }
        elements.startBtn.disabled = true;
        elements.pauseBtn.disabled = false;
        elements.completionMessage.classList.add('d-none');
        elements.noWorkoutsWarning.classList.add('d-none');
        state.timer = setInterval(timerTick, 1000);
    } else {
        elements.noWorkoutsWarning.classList.remove('d-none');
    }
}

async function initializeNewWorkout() {
    state.currentWorkoutIndex = 0;
    state.currentSet = 1;
    state.isRestPeriod = false;
    const currentWorkout = state.workouts[state.currentWorkoutIndex];
    state.currentTime = currentWorkout.interval;

    // Get new random technique
    state.currentTechnique = await getRandomTechnique();
    displayCurrentTechnique(state.currentTechnique);

    updateWorkoutState(WORKOUT_STATES.WORKOUT);
}

function resumeTimer() {
    updateWorkoutState(state.isRestPeriod ? WORKOUT_STATES.REST : WORKOUT_STATES.WORKOUT);
}

function pauseTimer() {
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    clearInterval(state.timer);
    state.isPaused = true;
}

function updateWorkoutState(newState) {
    elements.workoutStateDisplay.textContent = newState;
    speak(newState);
}

function timerTick() {
    state.currentTime--;
    if (state.currentTime < 0) {
        nextStep();
    } else {
        updateDisplay();
    }
}

async function nextStep() {
    state.isRestPeriod = !state.isRestPeriod;
    const currentWorkout = state.workouts[state.currentWorkoutIndex];

    if (state.isRestPeriod) {
        handleRestPeriod(currentWorkout);
    } else {
        await handleWorkoutPeriod(currentWorkout);
    }

    updateDisplay();
}

function handleRestPeriod(currentWorkout) {
    updateWorkoutState(WORKOUT_STATES.REST);

    if (state.currentSet < currentWorkout.sets) {
        state.currentSet++;
    } else {
        moveToNextWorkout();
    }
    state.currentTime = currentWorkout.rest;
}

async function handleWorkoutPeriod(currentWorkout) {
    updateWorkoutState(WORKOUT_STATES.WORKOUT);
    state.currentTime = currentWorkout.interval;

    // Get new random technique for each workout interval
    state.currentTechnique = await getRandomTechnique();
    displayCurrentTechnique(state.currentTechnique);

    // Speak the technique name
    if (state.currentTechnique) {
        speak(`Technique: ${state.currentTechnique.name}`);
    }
}

function moveToNextWorkout() {
    state.currentSet = 1;
    const currentExercise = elements.workoutList.children[state.currentWorkoutIndex];
    if (currentExercise) {
        currentExercise.classList.add('completed');
        currentExercise.dataset.completed = 'true';
    }

    state.currentWorkoutIndex++;

    if (state.currentWorkoutIndex >= state.workouts.length) {
        completeWorkout();
    }
}

function completeWorkout() {
    resetDisplay();
    elements.completionMessage.classList.remove('d-none');
    speak(WORKOUT_STATES.COMPLETED);
}

function updateDisplay() {
    if (state.workouts.length > 0 && state.currentWorkoutIndex < state.workouts.length) {
        const currentWorkout = state.workouts[state.currentWorkoutIndex];
        elements.timerDisplay.textContent = formatTime(state.currentTime);
        elements.currentSetDisplay.textContent = `Current Set: ${state.currentSet}`;
        elements.currentExerciseDisplay.textContent = `Current Exercise: ${currentWorkout.exerciseName}`;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

// Function to get random technique for timer mode
async function getRandomTechnique() {
    try {
        const response = await fetch('/roulette', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ category: 'all', belt: 'all' })
        });

        if (!response.ok) {
            throw new Error('Failed to get technique');
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting technique:', error);
        return null;
    }
}

// Display current technique in timer mode
function displayCurrentTechnique(technique) {
    if (technique) {
        document.getElementById('current-technique-display').style.display = 'block';
        document.getElementById('current-technique-name').textContent = technique.name;
        document.getElementById('current-technique-category').textContent =
            technique.category === 'ne-waza' ? 'Ground Technique' : 'Standing Technique';
        document.getElementById('current-technique-belt').textContent =
            technique.belt.charAt(0).toUpperCase() + technique.belt.slice(1);
    }
}