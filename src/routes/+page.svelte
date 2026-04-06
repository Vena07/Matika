<script>
  import Chart from 'chart.js/auto';
  import { 
    Trash2, Printer, BarChart3, Table2, Calculator, 
    TrendingUp, PieChart, LineChart, Hash, Target, 
    Activity, Percent, Database, SplitSquareHorizontal, Diff
  } from 'lucide-svelte';

  let rawInput = $state(`16 17 18 15 22 18 19 17 16 16
15 15 17 19 22 22 16 18 16 15
19 19 19 16 17 15 15 15 20 20
22 16 22 16 19 20 19 15 15 22
16 22 22 18 19 15 19 21 22 16
18 20 15 16 19 16 17 19 18 22`);

  let validDataRows = $state([]);
  let tableData = $state([]);
  let totalN = $state(0), mean = $state(0), median = $state(0), mode = $state([]);
  let meanAbsDev = $state(0), variance = $state(0), stdDev = $state(0), coefVar = $state(0);
  let sumXN = $state(0), sumAbsDevN = $state(0), sumSqDevN = $state(0);

  let pieCanvas = $state();
  let lineCanvas = $state();
  let pieChart;
  let lineChart;

  function format(num, decimals = 3) {
    if (num === null || isNaN(num)) return '-';
    return Number(num).toLocaleString('cs-CZ', { maximumFractionDigits: decimals });
  }

  function calculateStats() {
    let numbers = rawInput.split(/[\s,]+/).map(num => parseFloat(num)).filter(num => !isNaN(num));
    
    if (numbers.length === 0) {
      tableData = []; totalN = 0; mean = 0; median = 0; mode = [];
      meanAbsDev = 0; variance = 0; stdDev = 0; coefVar = 0;
      if (pieChart) pieChart.destroy();
      if (lineChart) lineChart.destroy();
      return;
    }

    let freqMap = {};
    numbers.forEach(num => { freqMap[num] = (freqMap[num] || 0) + 1; });

    let validRows = Object.keys(freqMap).map(key => ({
      x: parseFloat(key),
      n: freqMap[key]
    })).sort((a, b) => a.x - b.x);

    validDataRows = validRows;

    let sortedNumbers = [...numbers].sort((a, b) => a - b);
    let _totalN = numbers.length;
    let _sumXN = numbers.reduce((a, b) => a + b, 0);
    let _mean = _sumXN / _totalN;

    let maxFreq = Math.max(...Object.values(freqMap));
    mode = Object.keys(freqMap).filter(x => freqMap[x] === maxFreq).map(Number);

    if (_totalN % 2 !== 0) {
      median = sortedNumbers[Math.floor(_totalN / 2)];
    } else {
      median = (sortedNumbers[(_totalN / 2) - 1] + sortedNumbers[_totalN / 2]) / 2;
    }

    let _tableData = [], _sumAbsDevN = 0, _sumSqDevN = 0;

    validRows.forEach(row => {
      let xn = row.x * row.n;
      let absDev = Math.abs(row.x - _mean);
      let absDevN = absDev * row.n;
      let sqDev = Math.pow(row.x - _mean, 2);
      let sqDevN = sqDev * row.n;
      _sumAbsDevN += absDevN;
      _sumSqDevN += sqDevN;
      _tableData.push({ x: row.x, n: row.n, xn, absDev, absDevN, sqDev, sqDevN });
    });

    totalN = _totalN; sumXN = _sumXN; mean = _mean; tableData = _tableData;
    sumAbsDevN = _sumAbsDevN; sumSqDevN = _sumSqDevN;
    meanAbsDev = _sumAbsDevN / _totalN;
    variance = _sumSqDevN / _totalN; stdDev = Math.sqrt(variance);
    coefVar = (stdDev / _mean) * 100;

    if (pieCanvas && lineCanvas) {
      updateCharts(validRows);
    }
  }

  function updateCharts(validRows) {
    Chart.defaults.font.family = "'Inter', sans-serif";
    const labels = validRows.map(r => r.x);
    const dataPoints = validRows.map(r => r.n);
    const currentTotalN = dataPoints.reduce((a, b) => a + b, 0);
    const baseColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
    const backgroundColors = validRows.map((_, i) => baseColors[i % baseColors.length]);

    const pieLabels = validRows.map(r => {
      const perc = ((r.n / currentTotalN) * 100).toFixed(1);
      return `Hodnota ${r.x} (${perc} %)`;
    });

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: pieLabels,
        datasets: [{ data: dataPoints, backgroundColor: backgroundColors, borderWidth: 2, borderColor: '#ffffff' }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { 
          legend: { 
            position: 'bottom', // Dáno dolů, aby to v PDF nelezlo do grafu
            labels: { usePointStyle: true, padding: 15, font: { size: 11 } }
          }
        }
      }
    });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Četnost', data: dataPoints, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3, tension: 0.4, fill: true, pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  function printPDF() { window.print(); }
  $effect(() => { calculateStats(); });
</script>

<main class="app-container">
  <header class="page-header no-print">
    <div class="header-text">
      <div class="title-with-icon">
        <BarChart3 size={32} class="text-blue" strokeWidth={2.5} />
        <h1>Statistický analyzátor</h1>
      </div>
      <p>Rychlé zpracování rozdělení četností.</p>
    </div>
    {#if tableData.length > 0}
      <button class="btn-export" onclick={printPDF}>
        <Printer size={18} strokeWidth={2.5} />
        Exportovat PDF
      </button>
    {/if}
  </header>
  
  <section class="card input-section no-print">
    <div class="section-heading">
      <h2><Database size={20} class="heading-icon" /> Syrová data</h2>
    </div>
    <textarea bind:value={rawInput} placeholder="Vložte čísla souboru..."></textarea>
  </section>

  {#if tableData.length > 0}
    <section class="card results-section print-section">
      <div class="section-heading">
        <h2><Calculator size={20} class="heading-icon" /> Výpočtová tabulka</h2>
      </div>
      <div class="table-wrapper scrollable">
        <table class="modern-table result-table">
          <thead>
            <tr><th><i>x<sub>i</sub></i></th><th><i>n<sub>i</sub></i></th><th><i>x<sub>i</sub>&middot;n<sub>i</sub></i></th><th>|<i>x<sub>i</sub>&minus;x&#772;</i>|</th><th>|<i>x<sub>i</sub>&minus;x&#772;</i>|&middot;<i>n<sub>i</sub></i></th><th>(<i>x<sub>i</sub>&minus;x&#772;</i>)<sup>2</sup></th><th>(<i>x<sub>i</sub>&minus;x&#772;</i>)<sup>2</sup>&middot;<i>n<sub>i</sub></i></th></tr>
          </thead>
          <tbody>
            {#each tableData as row}
              <tr><td>{row.x}</td><td class="text-blue">{row.n}</td><td>{format(row.xn)}</td><td>{format(row.absDev)}</td><td>{format(row.absDevN)}</td><td>{format(row.sqDev)}</td><td>{format(row.sqDevN)}</td></tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="sum-row"><td>Σ</td><td class="text-blue">{totalN}</td><td>{format(sumXN)}</td><td>-</td><td>{format(sumAbsDevN)}</td><td>-</td><td>{format(sumSqDevN)}</td></tr>
          </tfoot>
        </table>
      </div>
    </section>

    <section class="card stats-section print-section">
      <div class="section-heading"><h2><TrendingUp size={20} class="heading-icon" /> Charakteristiky</h2></div>
      <div class="stats-grid">
        <div class="stat-card"><span class="stat-label"><Hash size={14} /> Rozsah</span><span class="stat-value text-blue">{totalN}</span></div>
        <div class="stat-card"><span class="stat-label"><Calculator size={14} /> Průměr</span><span class="stat-value">{format(mean)}</span></div>
        <div class="stat-card"><span class="stat-label"><SplitSquareHorizontal size={14} /> Medián</span><span class="stat-value">{format(median)}</span></div>
        <div class="stat-card"><span class="stat-label"><Target size={14} /> Modus</span><span class="stat-value">{mode.join(', ')}</span></div>
        <div class="stat-card"><span class="stat-label"><Diff size={14} /> Prům. odch.</span><span class="stat-value">{format(meanAbsDev)}</span></div>
        <div class="stat-card"><span class="stat-label"><Activity size={14} /> Rozptyl</span><span class="stat-value">{format(variance)}</span></div>
        <div class="stat-card"><span class="stat-label"><TrendingUp size={14} /> Směr. odch.</span><span class="stat-value">{format(stdDev)}</span></div>
        <div class="stat-card highlight-card"><span class="stat-label"><Percent size={14} /> Variační koef.</span><span class="stat-value text-white">{format(coefVar)} %</span></div>
      </div>
    </section>

    <section class="charts-container print-section">
      <div class="card chart-box">
        <div class="section-heading"><h3><PieChart size={18} class="heading-icon" /> Podíl hodnot</h3></div>
        <div class="canvas-wrapper"><canvas bind:this={pieCanvas}></canvas></div>
      </div>
      <div class="card chart-box">
        <div class="section-heading"><h3><LineChart size={18} class="heading-icon" /> Polygon četností</h3></div>
        <div class="canvas-wrapper"><canvas bind:this={lineCanvas}></canvas></div>
      </div>
    </section>

    <div class="print-only page-break"></div>
    <section class="print-only test-page">
      <header class="test-header">
        <h1>Statistika - Testové zadání</h1>
        <p>Jméno: _______________________ Třída: ______ Datum: ________</p>
      </header>
      <h3>Zadané hodnoty:</h3>
      <p class="raw-data-print">{rawInput}</p>
      <h3>Úkoly:</h3>
      <ol>
        <li>Sestavte tabulku četností a vypočítejte všechny sloupce.</li>
        <li>Určete průměr, modus, medián, rozptyl a směrodatnou odchylku.</li>
        <li>Sestrojte grafy na druhou stranu papíru.</li>
      </ol>
      <div class="empty-table-print">
        <table class="modern-table">
          <thead><tr><th><i>x<sub>i</sub></i></th><th><i>n<sub>i</sub></i></th><th>...</th><th>...</th><th>...</th><th>...</th><th>...</th></tr></thead>
          <tbody>{#each Array(10) as _}<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>{/each}</tbody>
        </table>
      </div>
    </section>

  {:else}
    <div class="empty-state">Vložte data pro zahájení výpočtů.</div>
  {/if}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  :global(body) { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
  .app-container { max-width: 1000px; margin: 0 auto; padding: 24px 16px; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .title-with-icon { display: flex; align-items: center; gap: 12px; }
  .btn-export { display: flex; align-items: center; gap: 8px; background: #3b82f6; color: white; border: none; padding: 10px 20px; font-weight: 600; border-radius: 10px; cursor: pointer; }
  .card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .section-heading { margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  textarea { width: 100%; height: 120px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-family: monospace; resize: vertical; }
  .table-wrapper { border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; }
  .modern-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; text-align: center; }
  .modern-table th { background-color: #f8fafc; padding: 12px; border-bottom: 1px solid #e2e8f0; color: #475569; }
  .modern-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
  .sum-row { background-color: #f8fafc; font-weight: 700; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
  .highlight-card { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; }
  .stat-label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
  .highlight-card .stat-label { color: #bfdbfe; }
  .stat-value { font-size: 1.2rem; font-weight: 700; }
  .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .canvas-wrapper { height: 320px; position: relative; }
  .text-blue { color: #3b82f6; }
  .empty-state { text-align: center; padding: 40px; color: #94a3b8; border: 2px dashed #e2e8f0; border-radius: 16px; }

  @media (max-width: 768px) {
    .charts-container { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
  }

  @media screen { .print-only { display: none !important; } }

  @media print {
    @page { size: A4; margin: 15mm; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { background-color: white; padding: 0; }
    .card { border: 1px solid #eee; box-shadow: none; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
    .canvas-wrapper { height: 250px !important; width: 100% !important; }
    .page-break { break-before: page; }
    .test-header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
    .raw-data-print { background: #f0f0f0; padding: 10px; border-radius: 5px; font-family: monospace; }
    .empty-table-print td { height: 30px; border: 1px solid #ccc; }
  }
</style>