
// BMS Cell Balancing Control Simulator

const cells = [50, 50, 50, 50];

let totalHeat = 0;
let running = false;
let timer = null;

const get = id => document.getElementById(id);

// Approximate cell voltage
function getVoltage(soc) {
    return 3.0 + (soc / 100) * 1.2;
}

// Update battery display and metrics
function updateDisplay() {
    let totalVoltage = 0;

    cells.forEach((soc, i) => {
        const voltage = getVoltage(soc);
        totalVoltage += voltage;

        const bar = get(`bar-${i}`);
        const v = get(`v-${i}`);
        const socText = get(`soc-${i}`);

        if (bar) {
            bar.style.width = soc + "%";
            bar.style.backgroundColor =
                soc >= 70 ? "var(--danger)" :
                soc >= 40 ? "var(--success)" :
                "var(--warning)";
        }

        if (v) v.textContent = voltage.toFixed(2);
        if (socText) socText.textContent = soc.toFixed(1);
    });

    const delta = Math.max(...cells) - Math.min(...cells);

    if (get("metric-heat"))
        get("metric-heat").textContent = totalHeat.toFixed(2) + " J";

    if (get("metric-delta"))
        get("metric-delta").textContent = delta.toFixed(1) + "%";

    if (get("metric-voltage"))
        get("metric-voltage").textContent =
            (totalVoltage / cells.length).toFixed(2) + " V";
}

// Update individual cell status
function setIndicator(index, text, className = "") {
    const indicator = get(`ind-${index}`);
    if (!indicator) return;

    indicator.textContent = text;
    indicator.className = "balancing-indicator";

    if (className) indicator.classList.add(className);
}

// Simulation log
function addLog(message) {
    const logs = get("logs");
    if (!logs) return;

    const entry = document.createElement("div");
    entry.textContent =
        `[${new Date().toLocaleTimeString()}] ${message}`;

    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
}

// Apply initial cell mismatch
function resetToMismatch() {
    cells.splice(0, cells.length, 75, 60, 40, 30);

    cells.forEach((_, i) => setIndicator(i, "Bypassing"));
    updateDisplay();

    addLog("Cell mismatch introduced.");
}

// Perform one simulation step
function simulateStep() {
    const strategy = get("strategy").value;
    const packState = get("pack-state").value;

    cells.forEach((_, i) => setIndicator(i, "Bypassing"));

    if (strategy === "none") {
        addLog("No balancing selected.");
        updateDisplay();
        return;
    }

    const maxSoc = Math.max(...cells);
    const minSoc = Math.min(...cells);

    if (maxSoc - minSoc < 0.2) {
        addLog("Cells are approximately balanced.");
        updateDisplay();
        return;
    }

    if (strategy === "passive") {
        // Passive balancing dissipates energy as heat.
        const threshold = packState === "charging" ? 55 : 60;

        cells.forEach((soc, i) => {
            if (soc > threshold) {
                const reduction = Math.min(0.15, soc);
                cells[i] -= reduction;

                totalHeat += 0.05;

                setIndicator(i, "Bleeding", "status-bleeding");
            }
        });

        addLog("Passive balancing step completed.");
    }

    if (strategy === "active") {
        // Transfer charge from the highest cell
        // to the lowest cell.
        const highIndex = cells.indexOf(maxSoc);
        const lowIndex = cells.indexOf(minSoc);

        const transfer = Math.min(0.2, (maxSoc - minSoc) / 2);

        cells[highIndex] -= transfer;
        cells[lowIndex] += transfer;

        setIndicator(highIndex, "Shuttling Out",
            "status-shuttling-out");

        setIndicator(lowIndex, "Shuttling In",
            "status-shuttling-in");

        addLog("Active charge transfer completed.");
    }

    updateDisplay();
}

// Run simulation
function startSim() {
    if (running) return;

    running = true;

    if (get("sim-status"))
        get("sim-status").textContent = "Running";

    addLog("Simulation started.");

    timer = setInterval(simulateStep, 500);
}

// Pause simulation
function pauseSim() {
    running = false;
    clearInterval(timer);
    timer = null;

    if (get("sim-status"))
        get("sim-status").textContent = "Paused";

    addLog("Simulation paused.");
}

// Reset simulation
function resetSim() {
    pauseSim();

    cells.splice(0, cells.length, 50, 50, 50, 50);
    totalHeat = 0;

    cells.forEach((_, i) => setIndicator(i, "Bypassing"));

    if (get("sim-status"))
        get("sim-status").textContent = "Stopped";

    updateDisplay();
    addLog("Simulation reset.");
}

// Connect HTML buttons
get("btn-start").addEventListener("click", startSim);
get("btn-pause").addEventListener("click", pauseSim);
get("btn-reset").addEventListener("click", resetSim);

// Support either an ID or the inline onclick in your HTML.
const mismatchButton = get("mismatchBtn");

if (mismatchButton) {
    mismatchButton.addEventListener("click", resetToMismatch);
}

// Initial dashboard
updateDisplay();
