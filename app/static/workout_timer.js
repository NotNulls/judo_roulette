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
    historyList: document.getElementById('training-history'),
    timerCategory: document.getElementById('timer-category'),
    timerBelts: document.getElementById('timer-belts'),
};

const WORKOUT_STATES = {
    WORKOUT: 'Workout',
    REST: 'Rest',
    COMPLETED: 'All workouts completed.',
};

let state = {
    workouts: [],
    currentWorkoutIndex: 0,
    currentSet: 1,
    isRestPeriod: false,
    timer: null,
    currentTime: 0,
    isPaused: false,
    isRunning: false,
    currentTechnique: null,
};

// ---------- Sound (WebAudio beep, no asset files needed) ----------
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function beep(freq = 880, duration = 0.18, type = 'sine', volume = 0.25) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}
const soundRoundStart = () => { beep(880, 0.15); setTimeout(() => beep(1175, 0.2), 160); };
const soundRoundEnd   = () => { beep(440, 0.25, 'square'); };
const soundTick       = () => { beep(660, 0.08); };

// ---------- Event listeners ----------
elements.addWorkoutBtn.addEventListener('click', addWorkout);
elements.clearWorkoutsBtn.addEventListener('click', clearWorkouts);
elements.startBtn.addEventListener('click', startTimer);
elements.pauseBtn.addEventListener('click', pauseTimer);

function addWorkout() {
    const workout = {
        exerciseName: elements.exerciseNameInput.value.trim() || 'Judo round',
        reps: parseInt(elements.repsInput.value) || 1,
        sets: parseInt(elements.setsInput.value) || 1,
        interval: parseInt(elements.intervalInput.value) || 30,
        rest: parseInt(elements.restInput.value) || 10,
    };
    if (!workout.interval || !workout.sets) return;
    state.workouts.push(workout);
    displayWorkout(workout);
    elements.exerciseNameInput.value = '';
}

function displayWorkout(workout) {
    const li = document.createElement('li');
    li.textContent = `${workout.exerciseName} x ${workout.sets} sets - ${workout.interval}s interval - ${workout.rest}s rest`;
    li.dataset.completed = 'false';
    elements.workoutList.appendChild(li);
}

function resetDisplay() {
    clearInterval(state.timer);
    state.timer = null;
    state.isRunning = false;
    elements.timerDisplay.textContent = '00:00';
    elements.timerDisplay.classList.remove('warning');
    elements.completionMessage.classList.add('d-none');
    elements.currentSetDisplay.textContent = '';
    elements.currentExerciseDisplay.textContent = '';
    elements.workoutStateDisplay.textContent = '';
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
    const tech = document.getElementById('current-technique-display');
    if (tech) tech.style.display = 'none';
}

function clearWorkouts() {
    elements.workoutList.innerHTML = '';
    state.workouts = [];
    state.currentWorkoutIndex = 0;
    state.currentSet = 1;
    state.isPaused = false;
    state.currentTechnique = null;
    if (elements.historyList) elements.historyList.innerHTML = '';
    resetDisplay();
}

async function startTimer() {
    ensureAudio();
    if (state.workouts.length === 0) {
        elements.noWorkoutsWarning.classList.remove('d-none');
        return;
    }
    elements.noWorkoutsWarning.classList.add('d-none');
    elements.completionMessage.classList.add('d-none');

    if (state.isPaused && state.isRunning === false) {
        // resume
        state.isPaused = false;
    } else if (!state.isRunning) {
        await initializeNewWorkout();
    } else {
        return; // already running
    }

    state.isRunning = true;
    elements.startBtn.disabled = true;
    elements.pauseBtn.disabled = false;
    updateDisplay();
    clearInterval(state.timer);
    state.timer = setInterval(timerTick, 1000);
}

async function initializeNewWorkout() {
    state.currentWorkoutIndex = 0;
    state.currentSet = 1;
    state.isRestPeriod = false;
    state.isPaused = false;
    const w = state.workouts[0];
    state.currentTime = w.interval;
    state.currentTechnique = await getRandomTechnique();
    displayCurrentTechnique(state.currentTechnique);
    updateWorkoutState(WORKOUT_STATES.WORKOUT);
    soundRoundStart();
}

function pauseTimer() {
    clearInterval(state.timer);
    state.timer = null;
    state.isPaused = true;
    state.isRunning = false;
    elements.startBtn.disabled = false;
    elements.pauseBtn.disabled = true;
}

function updateWorkoutState(newState) {
    elements.workoutStateDisplay.textContent = newState;
    speak(newState);
}

// --- FIXED TICK: decrement first, then act on 0, before any negative paint ---
function timerTick() {
    if (state.currentTime <= 0) {
        nextStep();
        return;
    }
    state.currentTime--;

    // 3-2-1 warning beep + red color
    if (state.currentTime <= 3 && state.currentTime > 0) {
        elements.timerDisplay.classList.add('warning');
        soundTick();
    } else {
        elements.timerDisplay.classList.remove('warning');
    }

    if (state.currentTime === 0) {
        soundRoundEnd();
    }

    updateDisplay();
}

async function nextStep() {
    elements.timerDisplay.classList.remove('warning');
    const currentWorkout = state.workouts[state.currentWorkoutIndex];

    if (!state.isRestPeriod) {
        // we just finished a WORK period -> go to REST (or advance if last set+last workout)
        if (state.currentSet < currentWorkout.sets) {
            // rest then next set of same workout
            state.isRestPeriod = true;
            state.currentTime = currentWorkout.rest;
            updateWorkoutState(WORKOUT_STATES.REST);
        } else {
            // finished last set of this workout
            markWorkoutCompleted(state.currentWorkoutIndex);
            const nextIdx = state.currentWorkoutIndex + 1;
            if (nextIdx >= state.workouts.length) {
                completeWorkout();
                return;
            }
            // rest, then move on to next workout's first set
            state.isRestPeriod = true;
            state.currentWorkoutIndex = nextIdx;
            state.currentSet = 1;
            state.currentTime = state.workouts[nextIdx].rest;
            updateWorkoutState(WORKOUT_STATES.REST);
        }
    } else {
        // we just finished a REST period -> start next WORK
        state.isRestPeriod = false;
        if (state.currentSet < state.workouts[state.currentWorkoutIndex].sets || state.currentSet === 1) {
            // either next set of same workout, or first set of newly-advanced workout
            if (state.currentSet !== 1) state.currentSet++;
        }
        state.currentTime = state.workouts[state.currentWorkoutIndex].interval;
        state.currentTechnique = await getRandomTechnique();
        displayCurrentTechnique(state.currentTechnique);
        updateWorkoutState(WORKOUT_STATES.WORKOUT);
        soundRoundStart();
    }
    updateDisplay();
}

function markWorkoutCompleted(idx) {
    const li = elements.workoutList.children[idx];
    if (li) {
        li.classList.add('completed');
        li.dataset.completed = 'true';
    }
}

function completeWorkout() {
    soundRoundEnd();
    resetDisplay();
    elements.completionMessage.classList.remove('d-none');
    speak(WORKOUT_STATES.COMPLETED);
}

function updateDisplay() {
    if (!state.workouts.length || state.currentWorkoutIndex >= state.workouts.length) return;
    const w = state.workouts[state.currentWorkoutIndex];
    elements.timerDisplay.textContent = formatTime(state.currentTime);
    elements.currentSetDisplay.textContent = `Current Set: ${state.currentSet} / ${w.sets}`;
    elements.currentExerciseDisplay.textContent = `Current Exercise: ${w.exerciseName}`;
}

function formatTime(seconds) {
    const s = Math.max(0, seconds | 0);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
}

// ---------- Technique fetch + history ----------
function getSelectedBelts() {
    if (!elements.timerBelts) return 'all';
    const sel = Array.from(elements.timerBelts.selectedOptions).map(o => o.value);
    return sel.length ? sel : 'all';
}
function getSelectedCategory() {
    return elements.timerCategory ? elements.timerCategory.value : 'all';
}

async function getRandomTechnique() {
    try {
        const res = await fetch('/roulette', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: getSelectedCategory(), belt: getSelectedBelts() }),
        });
        if (!res.ok) throw new Error('roulette failed');
        const tech = await res.json();
        addToHistory(tech);
        return tech;
    } catch (e) {
        console.error(e);
        return null;
    }
}

function addToHistory(t) {
    if (!elements.historyList || !t) return;
    const li = document.createElement('li');
    const time = new Date().toLocaleTimeString();
    li.innerHTML = `<strong>${t.name}</strong> — <span class="belt-${t.belt}">${t.belt}</span> · ${t.category} <em style="color:#888">(${time})</em>`;
    elements.historyList.prepend(li);
}

function displayCurrentTechnique(t) {
    const box = document.getElementById('current-technique-display');
    if (!box || !t) return;
    box.style.display = 'block';
    document.getElementById('current-technique-name').textContent = t.name;
    document.getElementById('current-technique-category').textContent =
        t.category === 'ne-waza' ? 'Ground Technique' : 'Standing Technique';
    const beltEl = document.getElementById('current-technique-belt');
    beltEl.textContent = t.belt.charAt(0).toUpperCase() + t.belt.slice(1);
    beltEl.className = `belt-${t.belt}`;
}
