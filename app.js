// Predefined distinct colors for processes
const PROCESS_COLORS = [
  '#2563eb', '#dc2626', '#d97706', '#16a34a', 
  '#9333ea', '#0891b2', '#475569', '#db2777'
];

let processCount = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDefaultProcesses();
  toggleQuantumInput();
});

function toggleQuantumInput() {
  const algo = document.getElementById('algorithmSelect').value;
  const quantumGroup = document.getElementById('quantumGroup');
  quantumGroup.style.display = (algo === 'RR') ? 'flex' : 'none';
}

function addProcessRow(arrival = 0, cpu = 1) {
  processCount++;
  const charLabel = String.fromCharCode(64 + processCount); // A, B, C, ...
  const color = PROCESS_COLORS[(processCount - 1) % PROCESS_COLORS.length];

  const tbody = document.getElementById('processTableBody');
  const tr = document.createElement('tr');
  tr.id = `row-${charLabel}`;
  tr.innerHTML = `
    <td>
      <span class="process-badge" style="background-color: ${color};">${charLabel}</span>
    </td>
    <td>
      <input type="number" class="arrival-input" value="${arrival}" min="0" max="20" required>
    </td>
    <td>
      <input type="number" class="cpu-input" value="${cpu}" min="1" max="20" required>
    </td>
    <td>
      <button type="button" class="btn btn-danger" onclick="removeProcessRow('row-${charLabel}')">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function removeProcessRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) row.remove();
}

function loadDefaultProcesses() {
  const tbody = document.getElementById('processTableBody');
  tbody.innerHTML = '';
  processCount = 0;

  // Default set based on assignment example (>5 processes)
  const defaultData = [
    { arrival: 2, cpu: 1 },
    { arrival: 3, cpu: 5 },
    { arrival: 0, cpu: 4 },
    { arrival: 5, cpu: 3 },
    { arrival: 9, cpu: 2 },
    { arrival: 7, cpu: 4 },
    { arrival: 12, cpu: 1 }
  ];

  defaultData.forEach(p => addProcessRow(p.arrival, p.cpu));
}

function validateInputs(processes, algorithm, quantum) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.style.display = 'none';
  errorDiv.innerText = '';

  if (processes.length === 0) {
    errorDiv.innerText = 'Error: Debe ingresar al menos un proceso.';
    errorDiv.style.display = 'block';
    return false;
  }

  if (algorithm === 'RR') {
    if (isNaN(quantum) || quantum < 1 || quantum > 20) {
      errorDiv.innerText = 'Error: El Quantum debe estar entre 1 y 20.';
      errorDiv.style.display = 'block';
      return false;
    }
  }

  for (let p of processes) {
    if (isNaN(p.arrival) || p.arrival < 0 || p.arrival > 20) {
      errorDiv.innerText = `Error en Proceso ${p.id}: El Tiempo de Llegada debe estar entre 0 y 20.`;
      errorDiv.style.display = 'block';
      return false;
    }
    if (isNaN(p.cpu) || p.cpu < 1 || p.cpu > 20) {
      errorDiv.innerText = `Error en Proceso ${p.id}: El Tiempo de CPU debe estar entre 1 y 20.`;
      errorDiv.style.display = 'block';
      return false;
    }
  }

  return true;
}

function collectInputData() {
  const rows = document.querySelectorAll('#processTableBody tr');
  const processes = [];

  rows.forEach((row) => {
    const id = row.querySelector('.process-badge').innerText;
    const color = row.querySelector('.process-badge').style.backgroundColor;
    const arrival = parseInt(row.querySelector('.arrival-input').value);
    const cpu = parseInt(row.querySelector('.cpu-input').value);

    processes.push({ id, color, arrival, cpu, remaining: cpu });
  });

  return processes;
}

// ROUND ROBIN ALGORITHM (RONDA)
function simulateRoundRobin(processes, quantum) {
  let currentTime = 0;
  let remainingProcesses = processes.map(p => ({
    ...p,
    remainingCPU: p.cpu,
    completionTime: 0,
    turnaroundTime: 0,
    waitingTime: 0
  }));

  // Sort initially by arrival time
  remainingProcesses.sort((a, b) => a.arrival - b.arrival);

  let readyQueue = [];
  let timeline = [];
  let completedCount = 0;
  let totalProcesses = remainingProcesses.length;
  let arrivedMap = new Array(totalProcesses).fill(false); // FIXED: "new" instead of "nwe"

  const checkArrivals = () => {
    for (let i = 0; i < totalProcesses; i++) {
      if (!arrivedMap[i] && remainingProcesses[i].arrival <= currentTime) {
        readyQueue.push(remainingProcesses[i]);
        arrivedMap[i] = true; // FIXED: indexed array "arrivedMap[i]"
      }
    }
  };

  checkArrivals();

  while (completedCount < totalProcesses) {
    if (readyQueue.length === 0) {
      // Find next arrival time when CPU is idle
      let nextArrival = Infinity;
      for (let i = 0; i < totalProcesses; i++) {
        if (!arrivedMap[i] && remainingProcesses[i].arrival < nextArrival) {
          nextArrival = remainingProcesses[i].arrival;
        }
      }
      if (nextArrival !== Infinity) {
        currentTime = nextArrival;
        checkArrivals();
      }
      continue;
    }

    let currentProcess = readyQueue.shift();
    let execTime = Math.min(currentProcess.remainingCPU, quantum);

    let startTime = currentTime;
    currentTime += execTime;
    currentProcess.remainingCPU -= execTime;

    timeline.push({
      id: currentProcess.id,
      color: currentProcess.color,
      start: startTime,
      end: currentTime
    });

    // Queue any processes that arrived while this quantum was running
    checkArrivals();

    if (currentProcess.remainingCPU > 0) {
      readyQueue.push(currentProcess);
    } else {
      currentProcess.completionTime = currentTime;
      currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrival;
      currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.cpu; // FIXED: camelCase "waitingTime"
      completedCount++;
    }
  }

  return { timeline, results: remainingProcesses };
}

function runSimulation() {
  const algorithm = document.getElementById('algorithmSelect').value;
  const quantum = parseInt(document.getElementById('quantumInput').value);
  const processes = collectInputData();

  if (!validateInputs(processes, algorithm, quantum)) {
    return;
  }

  let simulationResult;
  if (algorithm === 'RR') {
    simulationResult = simulateRoundRobin(processes, quantum);
  } else {
    simulationResult = simulateSRTF(processes);
  }

  renderGanttChart(simulationResult.timeline);
  renderResultsTable(simulationResult.result);

  document.getElementById('resultsSection').style.display = 'block';
}