/**
 * Bento Dashboard & Analytics Charts Manager (Chart.js)
 * Supports Bento Grid widgets and the 4 Analytics Section charts.
 */
let bentoDonutChart = null;
let bentoWavyChart = null;

let chartVehicleFlow = null;
let chartViolationsByType = null;
let chartBusyZones = null;
let chartComplaintCategories = null;

function getThemeColors() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  return {
    gridColor: isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.05)",
    textColor: isLight ? "#6e6e73" : "#9ca3af",
    tooltipBg: isLight ? "#ffffff" : "#1b1c21",
    tooltipText: isLight ? "#1d1d1f" : "#f3f4f6",
    tooltipTitle: isLight ? "#d97706" : "#faea73",
    tooltipBorder: isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.1)",
    doughnutBorder: isLight ? "#ffffff" : "#202127"
  };
}

const ChartsManager = {
  initAll() {
    this.initBentoDonut();
    this.initBentoWavy();
    this.initAnalyticsCharts();
  },

  // =========================================================================
  // 1. Bento Overview Charts (Matching Wise Theme Reference)
  // =========================================================================

  // Top-Left Yellow Card Donut Chart (Traffic Flow Breakdown)
  initBentoDonut() {
    const ctx = document.getElementById("bentoDonutCanvas");
    if (!ctx) return;
    if (bentoDonutChart) bentoDonutChart.destroy();

    bentoDonutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Two-Wheelers (Bikes/Scooters)", "Four-Wheelers (Cars/Trucks)"],
        datasets: [
          {
            data: [68, 32],
            backgroundColor: ["#191a1f", "rgba(25, 26, 31, 0.22)"],
            borderWidth: 0,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "76%",
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#191a1f",
            titleColor: "#faea73",
            bodyColor: "#ffffff",
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${context.raw}%`;
              }
            }
          }
        }
      }
    });
  },

  // Bottom-Left Card: Wavy Sinusoidal Line Graph (Real-Time Inference FPS Latency)
  initBentoWavy() {
    const ctx = document.getElementById("bentoWavyCanvas");
    if (!ctx) return;
    if (bentoWavyChart) bentoWavyChart.destroy();

    bentoWavyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"],
        datasets: [
          {
            label: "Stream Processing FPS",
            data: [26, 28, 25, 29, 27, 30, 28, 29, 27, 28.5],
            borderColor: "rgba(250, 234, 115, 0.85)",
            borderWidth: 2,
            tension: 0.45,
            pointRadius: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
            pointBackgroundColor: "#faea73",
            pointBorderColor: "#1b1c21",
            pointBorderWidth: 2,
            fill: false
          },
          {
            label: "Baseline Target FPS",
            data: [25, 25, 25, 25, 25, 25, 25, 25, 25, 25],
            borderColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.45,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false, min: 0, max: 40 }
        }
      }
    });
  },

  // =========================================================================
  // 2. Section 4: Traffic & Safety Analytics Charts
  // =========================================================================

  initAnalyticsCharts() {
    this.initVehicleFlowChart();
    this.initViolationsByTypeChart();
    this.initBusyZonesChart();
    this.initComplaintCategoriesChart();
  },

  // Chart 1: Vehicle counts over time (hourly flow)
  initVehicleFlowChart() {
    const ctx = document.getElementById("chartVehicleFlow");
    if (!ctx) return;
    if (chartVehicleFlow) chartVehicleFlow.destroy();

    const colors = getThemeColors();

    chartVehicleFlow = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"],
        datasets: [{
          label: "Vehicles / Hour",
          data: [42, 185, 340, 260, 240, 310, 420, 290, 110],
          borderColor: "#faea73",
          backgroundColor: "rgba(250, 234, 115, 0.12)",
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#faea73",
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 10 } }
          }
        }
      }
    });
  },

  // Chart 2: Violation counts by type
  initViolationsByTypeChart() {
    const ctx = document.getElementById("chartViolationsByType");
    if (!ctx) return;
    if (chartViolationsByType) chartViolationsByType.destroy();

    const colors = getThemeColors();

    chartViolationsByType = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["No Helmet", "No Seatbelt", "Red Light", "Wrong Way", "Speeding"],
        datasets: [{
          label: "Violations Logged",
          data: [18, 14, 12, 6, 4],
          backgroundColor: [
            "#faea73",
            "rgba(250, 234, 115, 0.7)",
            "#ef4444",
            "rgba(239, 68, 68, 0.65)",
            "rgba(156, 163, 175, 0.5)"
          ],
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 10 }, stepSize: 5 }
          }
        }
      }
    });
  },

  // Chart 3: Busy locations or camera zones
  initBusyZonesChart() {
    const ctx = document.getElementById("chartBusyZones");
    if (!ctx) return;
    if (chartBusyZones) chartBusyZones.destroy();

    const colors = getThemeColors();

    chartBusyZones = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Sector 14", "NH-44 Flyover", "Kundli Border", "GT Road Cross", "Mall Road"],
        datasets: [{
          axis: "y",
          label: "Vehicles Counted",
          data: [420, 385, 295, 240, 190],
          backgroundColor: [
            "#faea73",
            "rgba(250, 234, 115, 0.8)",
            "rgba(250, 234, 115, 0.6)",
            "rgba(250, 234, 115, 0.4)",
            "rgba(250, 234, 115, 0.25)"
          ],
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { size: 10 } }
          },
          y: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 10 } }
          }
        }
      }
    });
  },

  // Chart 4: Complaint categories and trends
  initComplaintCategoriesChart() {
    const ctx = document.getElementById("chartComplaintCategories");
    if (!ctx) return;
    if (chartComplaintCategories) chartComplaintCategories.destroy();

    const colors = getThemeColors();

    chartComplaintCategories = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Road Hazards (Potholes)", "Signal Failures", "Emergency Gridlock", "Safety Violations", "Congestion"],
        datasets: [{
          data: [14, 8, 6, 7, 5],
          backgroundColor: [
            "#faea73",
            "#38bdf8",
            "#ef4444",
            "#fb923c",
            "#a855f7"
          ],
          borderWidth: 2,
          borderColor: colors.doughnutBorder
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: colors.textColor,
              font: { size: 10 },
              boxWidth: 10,
              padding: 8
            }
          },
          tooltip: {
            backgroundColor: colors.tooltipBg,
            titleColor: colors.tooltipTitle,
            bodyColor: colors.tooltipText,
            borderColor: colors.tooltipBorder,
            borderWidth: 1
          }
        }
      }
    });
  },

  // Update Section 4 Analytics from API
  updateAnalyticsFromAPI(summary) {
    if (!summary) return;

    if (chartVehicleFlow && summary.vehicle_flow_timeline) {
      chartVehicleFlow.data.labels = summary.vehicle_flow_timeline.labels;
      chartVehicleFlow.data.datasets[0].data = summary.vehicle_flow_timeline.counts;
      chartVehicleFlow.update("none");
    }

    if (chartViolationsByType && summary.violation_types) {
      chartViolationsByType.data.labels = summary.violation_types.labels;
      chartViolationsByType.data.datasets[0].data = summary.violation_types.counts;
      chartViolationsByType.update("none");
    }

    if (chartBusyZones && summary.busy_zones) {
      chartBusyZones.data.labels = summary.busy_zones.labels;
      chartBusyZones.data.datasets[0].data = summary.busy_zones.counts;
      chartBusyZones.update("none");
    }

    if (chartComplaintCategories && summary.complaint_categories) {
      chartComplaintCategories.data.labels = summary.complaint_categories.labels;
      chartComplaintCategories.data.datasets[0].data = summary.complaint_categories.counts;
      chartComplaintCategories.update("none");
    }
  },

  // Dynamic Bento Grid updates from CV engine stats
  updateLiveBentoCharts(stats) {
    if (!stats) return;

    // 1. Donut Chart with real percentages
    if (bentoDonutChart) {
      const p1 = stats.two_wheelers_pct || 50;
      const p2 = stats.four_wheelers_pct || 50;
      bentoDonutChart.data.datasets[0].data = [p1, p2];
      bentoDonutChart.update("none");
    }

    // 2. Wavy Chart with actual measured FPS history
    if (bentoWavyChart && stats.fps_history && stats.fps_history.length > 0) {
      bentoWavyChart.data.datasets[0].data = stats.fps_history;
      const ptRadius = stats.fps_history.map((_, i) => i === stats.fps_history.length - 1 ? 5 : 0);
      bentoWavyChart.data.datasets[0].pointRadius = ptRadius;
      bentoWavyChart.update("none");
    }
  },

  resizeAll() {
    if (bentoDonutChart) bentoDonutChart.resize();
    if (bentoWavyChart) bentoWavyChart.resize();
    if (chartVehicleFlow) chartVehicleFlow.resize();
    if (chartViolationsByType) chartViolationsByType.resize();
    if (chartBusyZones) chartBusyZones.resize();
    if (chartComplaintCategories) chartComplaintCategories.resize();
  }
};
