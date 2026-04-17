document.addEventListener("DOMContentLoaded", () => {
  const ui = {
    liveIndicator: document.getElementById("liveIndicator"),
    camStatus: document.getElementById("camStatus"),
    clock: document.getElementById("clock"),
    fpsValue: document.getElementById("fpsValue"),
    fpsCounter: document.getElementById("fpsCounter"),
    latencyValue: document.getElementById("latencyValue"),
    resultTag: document.getElementById("resultTag"),
    frameId: document.getElementById("frameId"),
    edgeText: document.getElementById("edgeText"),
    confidenceRing: document.getElementById("confidenceRing"),
    confidenceRingText: document.getElementById("confidenceRingText"),
    bboxOverlay: document.getElementById("bboxOverlay"),
    bboxLabel: document.getElementById("bboxLabel"),
    infoResult: document.getElementById("infoResult"),
    infoConfidence: document.getElementById("infoConfidence"),
    infoTimestamp: document.getElementById("infoTimestamp"),
    bboxText: document.getElementById("bboxText"),
    infoEdge: document.getElementById("infoEdge"),
    infoValidation: document.getElementById("infoValidation"),
    severityValue: document.getElementById("severityValue"),
    severityBar: document.getElementById("severityBar"),
    lengthValue: document.getElementById("lengthValue"),
    lengthBar: document.getElementById("lengthBar"),
    edgeValue: document.getElementById("edgeValue"),
    edgeBar: document.getElementById("edgeBar"),
    pipelineProgress: document.getElementById("pipelineProgress"),
    gpuLoad: document.getElementById("gpuLoad"),
    cpuLoad: document.getElementById("cpuLoad"),
    tempValue: document.getElementById("tempValue"),
    edgeDensity: document.getElementById("edgeDensity"),
    gpuBar: document.getElementById("gpuBar"),
    cpuBar: document.getElementById("cpuBar"),
    tempBar: document.getElementById("tempBar"),
    edgeDensityBar: document.getElementById("edgeDensityBar"),
    systemStatus: document.getElementById("systemStatus"),
    cameraState: document.getElementById("cameraState"),
    detectorState: document.getElementById("detectorState"),
    queueDepth: document.getElementById("queueDepth"),
    alertCount: document.getElementById("alertCount"),
    logList: document.getElementById("logList"),
    liveFeed: document.getElementById("liveFeed"),
    stageEdge: document.getElementById("stageEdge"),
    stageMorph: document.getElementById("stageMorph"),
    stageSegment: document.getElementById("stageSegment"),
    stageValidate: document.getElementById("stageValidate"),
  };

  const controls = {
    startBtn: document.getElementById("startBtn"),
    stopBtn: document.getElementById("stopBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    exitBtn: document.getElementById("exitBtn"),
    snapshotBtn: document.getElementById("snapshotBtn"),
    autoCaptureBtn: document.getElementById("autoCaptureBtn"),
    autoAlertBtn: document.getElementById("autoAlertBtn"),
    saveLogBtn: document.getElementById("saveLogBtn"),
    exportBtn: document.getElementById("exportBtn"),
  };

  const backend = {
    enabled: false,
    endpoints: {
      liveFeed: "/video_feed",
      edge: "/stage/edge",
      morph: "/stage/morph",
      segment: "/stage/segment",
      validate: "/stage/validate",
      status: "/api/status",
    },
  };

  const state = {
    live: false,
    confidence: 0.95,
    bbox: { x: 0.38, y: 0.18, w: 0.22, h: 0.45 },
    edgeIntensity: 15.9,
    severity: 0.78,
    length: 18.4,
    fps: 0,
    latency: 0,
    gpu: 42,
    cpu: 35,
    temp: 58,
    edgeDensity: 0.71,
    frameId: 10248,
    alerts: 0,
    queue: 0,
    pipeline: 30,
  };

  const logMessages = [
    "Frame successfully captured",
    "Processing frame...",
    "Crack detected",
    "Edge map updated",
    "Morphological processing complete",
    "Crack segmentation updated",
    "Validation pass",
  ];

  let metricsTimer = null;
  let logTimer = null;
  let clockTimer = null;
  let chartTimer = null;
  let perfChart = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const formatTime = (date) =>
    date.toLocaleTimeString([], { hour12: false });

  const updateClock = () => {
    const now = new Date();
    ui.clock.textContent = formatTime(now);
    ui.infoTimestamp.textContent = now.toLocaleString();
  };

  const setConfidence = (value) => {
    const percent = clamp(value * 100, 0, 100);
    ui.confidenceRing.style.setProperty("--value", percent.toFixed(1));
    ui.confidenceRingText.textContent = `${percent.toFixed(1)}%`;
    ui.infoConfidence.textContent = `${percent.toFixed(1)}%`;
  };

  const setBoundingBox = (bbox) => {
    ui.bboxOverlay.style.setProperty("--x", (bbox.x * 100).toFixed(1));
    ui.bboxOverlay.style.setProperty("--y", (bbox.y * 100).toFixed(1));
    ui.bboxOverlay.style.setProperty("--w", (bbox.w * 100).toFixed(1));
    ui.bboxOverlay.style.setProperty("--h", (bbox.h * 100).toFixed(1));
    ui.bboxText.textContent = `[${bbox.x.toFixed(2)}, ${bbox.y.toFixed(
      2
    )}, ${bbox.w.toFixed(2)}, ${bbox.h.toFixed(2)}]`;
  };

  const setSeverity = (value) => {
    const severityValue = clamp(value, 0, 1);
    let label = "Low";
    let className = "low";
    if (severityValue > 0.7) {
      label = "High";
      className = "high";
    } else if (severityValue > 0.4) {
      label = "Medium";
      className = "medium";
    }
    ui.severityValue.textContent = label;
    ui.severityValue.classList.remove("low", "medium", "high");
    ui.severityValue.classList.add(className);
    ui.severityBar.style.width = `${(severityValue * 100).toFixed(0)}%`;
  };

  const updateMeters = () => {
    const lengthPercent = clamp(state.length / 30, 0, 1) * 100;
    const edgePercent = clamp(state.edgeIntensity / 30, 0, 1) * 100;
    ui.lengthBar.style.width = `${lengthPercent.toFixed(0)}%`;
    ui.edgeBar.style.width = `${edgePercent.toFixed(0)}%`;

    ui.gpuBar.style.width = `${state.gpu}%`;
    ui.cpuBar.style.width = `${state.cpu}%`;
    ui.tempBar.style.width = `${clamp(state.temp / 90, 0, 1) * 100}%`;
    ui.edgeDensityBar.style.width = `${clamp(state.edgeDensity, 0, 1) * 100}%`;
  };

  const updateUI = () => {
    ui.frameId.textContent = `F-${state.frameId}`;
    ui.resultTag.textContent = state.live ? "Crack Detected" : "Standby";
    ui.infoResult.textContent = state.live ? "Crack Detected" : "Awaiting Feed";
    ui.infoEdge.textContent = state.edgeIntensity.toFixed(1);
    ui.edgeText.textContent = state.edgeIntensity.toFixed(1);
    ui.edgeValue.textContent = state.edgeIntensity.toFixed(1);
    ui.fpsValue.textContent = state.fps;
    ui.fpsCounter.textContent = state.fps;
    ui.latencyValue.textContent = state.latency;
    ui.gpuLoad.textContent = `${state.gpu}%`;
    ui.cpuLoad.textContent = `${state.cpu}%`;
    ui.tempValue.textContent = `${state.temp} C`;
    ui.edgeDensity.textContent = state.edgeDensity.toFixed(2);
    ui.queueDepth.textContent = state.queue;
    ui.alertCount.textContent = state.alerts;
    ui.pipelineProgress.style.width = `${state.pipeline}%`;
    ui.infoValidation.textContent = state.live ? "Pass" : "Idle";
    setConfidence(state.confidence);
    setBoundingBox(state.bbox);
    setSeverity(state.severity);
    updateMeters();
  };

  const addLog = (message) => {
    const now = new Date();
    const line = document.createElement("div");
    line.className = "log-line";
    line.innerHTML = `<span class="log-time">[${formatTime(
      now
    )}]</span> ${message}`;
    ui.logList.prepend(line);
    const lines = ui.logList.querySelectorAll(".log-line");
    if (lines.length > 12) {
      lines[lines.length - 1].remove();
    }
  };

  const simulateMetrics = () => {
    state.frameId += 1;
    state.confidence = clamp(state.confidence + (Math.random() - 0.5) * 0.06, 0.68, 0.99);
    state.edgeIntensity = clamp(state.edgeIntensity + (Math.random() - 0.5) * 1.8, 8, 26);
    state.severity = clamp(state.severity + (Math.random() - 0.5) * 0.08, 0.2, 0.95);
    state.length = clamp(state.length + (Math.random() - 0.5) * 1.6, 6, 28);
    state.fps = Math.round(clamp(42 + (Math.random() - 0.5) * 8, 30, 60));
    state.latency = Math.round(clamp(22 + (Math.random() - 0.5) * 10, 12, 40));
    state.gpu = Math.round(clamp(state.gpu + (Math.random() - 0.5) * 6, 20, 95));
    state.cpu = Math.round(clamp(state.cpu + (Math.random() - 0.5) * 6, 15, 85));
    state.temp = Math.round(clamp(state.temp + (Math.random() - 0.5) * 3, 44, 78));
    state.edgeDensity = clamp(state.edgeDensity + (Math.random() - 0.5) * 0.06, 0.4, 0.95);
    state.queue = Math.max(0, Math.round(state.queue + (Math.random() - 0.5) * 2));
    state.pipeline = clamp(state.pipeline + (Math.random() - 0.5) * 18, 20, 98);
    state.bbox.x = clamp(state.bbox.x + (Math.random() - 0.5) * 0.02, 0.15, 0.7);
    state.bbox.y = clamp(state.bbox.y + (Math.random() - 0.5) * 0.02, 0.1, 0.6);
  };

  const setLive = (active) => {
    state.live = active;
    ui.liveIndicator.classList.toggle("active", active);
    ui.camStatus.textContent = active ? "Live" : "Standby";
    ui.cameraState.textContent = active ? "Online" : "Offline";
    ui.detectorState.textContent = active ? "Active" : "Idle";
    ui.systemStatus.textContent = active ? "Monitoring" : "System Idle";
    if (active) {
      addLog("Live detection started");
    } else {
      addLog("Live detection stopped");
    }
  };

  const connectBackend = () => {
    if (!backend.enabled) {
      return;
    }
    ui.liveFeed.src = backend.endpoints.liveFeed;
    refreshStageImages();
  };

  const refreshStageImages = () => {
    if (!backend.enabled) {
      return;
    }
    const stamp = Date.now();
    ui.stageEdge.src = `${backend.endpoints.edge}?t=${stamp}`;
    ui.stageMorph.src = `${backend.endpoints.morph}?t=${stamp}`;
    ui.stageSegment.src = `${backend.endpoints.segment}?t=${stamp}`;
    ui.stageValidate.src = `${backend.endpoints.validate}?t=${stamp}`;
  };

  const initChart = () => {
    const ctx = document.getElementById("perfChart");
    if (!ctx || !window.Chart) {
      return;
    }
    perfChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from({ length: 12 }, () => ""),
        datasets: [
          {
            label: "GPU",
            data: Array.from({ length: 12 }, () => state.gpu),
            borderColor: "#00ff9d",
            backgroundColor: "rgba(0, 255, 157, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "CPU",
            data: Array.from({ length: 12 }, () => state.cpu),
            borderColor: "#00e5ff",
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Temp",
            data: Array.from({ length: 12 }, () => state.temp),
            borderColor: "#ffc857",
            backgroundColor: "rgba(255, 200, 87, 0.08)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#e6f6ff",
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#8aa7c4" },
            grid: { color: "rgba(0, 229, 255, 0.08)" },
          },
          y: {
            ticks: { color: "#8aa7c4" },
            grid: { color: "rgba(0, 229, 255, 0.08)" },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
      },
    });
  };

  const updateChart = () => {
    if (!perfChart) {
      return;
    }
    perfChart.data.labels.push("");
    perfChart.data.labels.shift();
    perfChart.data.datasets[0].data.push(state.gpu);
    perfChart.data.datasets[0].data.shift();
    perfChart.data.datasets[1].data.push(state.cpu);
    perfChart.data.datasets[1].data.shift();
    perfChart.data.datasets[2].data.push(state.temp);
    perfChart.data.datasets[2].data.shift();
    perfChart.update("none");
  };

  const startSimulation = () => {
    if (metricsTimer) {
      return;
    }
    metricsTimer = setInterval(() => {
      simulateMetrics();
      updateUI();
      if (backend.enabled) {
        refreshStageImages();
      }
    }, 1500);
    logTimer = setInterval(() => {
      addLog(logMessages[Math.floor(Math.random() * logMessages.length)]);
    }, 2400);
    chartTimer = setInterval(updateChart, 2000);
  };

  const stopSimulation = () => {
    clearInterval(metricsTimer);
    clearInterval(logTimer);
    clearInterval(chartTimer);
    metricsTimer = null;
    logTimer = null;
    chartTimer = null;
  };

  controls.startBtn.addEventListener("click", () => {
    setLive(true);
    connectBackend();
    startSimulation();
  });

  controls.stopBtn.addEventListener("click", () => {
    setLive(false);
    stopSimulation();
  });

  controls.settingsBtn.addEventListener("click", () => {
    addLog("Settings panel opened");
  });

  controls.exitBtn.addEventListener("click", () => {
    setLive(false);
    stopSimulation();
    addLog("Exit requested by operator");
  });

  controls.snapshotBtn.addEventListener("click", () => {
    addLog("Snapshot captured");
  });

  controls.autoCaptureBtn.addEventListener("click", () => {
    addLog("Auto capture toggled");
  });

  controls.autoAlertBtn.addEventListener("click", () => {
    state.alerts += 1;
    addLog("Auto alert toggled");
  });

  controls.saveLogBtn.addEventListener("click", () => {
    addLog("Logs archived");
  });

  controls.exportBtn.addEventListener("click", () => {
    addLog("Export started");
  });

  clockTimer = setInterval(updateClock, 1000);
  updateClock();
  initChart();
  updateUI();

  const autoDemo = true;
  if (autoDemo) {
    setLive(true);
    startSimulation();
  }
});
