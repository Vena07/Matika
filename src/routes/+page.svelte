<script>
  import Chart from 'chart.js/auto';
  import { 
    Trash2, Printer, BarChart3, Table2, Calculator, 
    TrendingUp, PieChart, LineChart, Hash, Target, 
    Activity, Percent, Database, SplitSquareHorizontal, Diff
  } from 'lucide-svelte';

  // Jedno velké pole pro syrová data
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
    numbers.forEach(num => {
      freqMap[num] = (freqMap[num] || 0) + 1;
    });

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
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = '#64748b';

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
        datasets: [{ 
          data: dataPoints, backgroundColor: backgroundColors,
          borderWidth: 2, borderColor: '#ffffff', hoverOffset: 6
        }]
      },
      options: { 
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: { 
          legend: { 
            position: window.innerWidth < 600 ? 'bottom' : 'right', 
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } }
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
          borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#ffffff',
          pointBorderWidth: 2, pointBorderColor: '#3b82f6'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { 
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function printPDF() {
    window.print();
  }

  $effect(() => {
    calculateStats();
  });
</script>

<main class="app-container">
  <header class="page-header no-print">
    <div class="header-text">
      <div class="title-with-icon">
        <BarChart3 size={32} class="text-blue" strokeWidth={2.5} />
        <h1>Statistický analyzátor</h1>
      </div>
      <p>Bleskové zpracování rozdělení četností.</p>
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
      <p class="subtitle">Vložte všechna čísla souboru najednou.</p>
    </div>
    <div class="table-wrapper">
      <textarea bind:value={rawInput} placeholder="Sem vložte všechna čísla..."></textarea>
    </div>
  </section>

  {#if tableData.length > 0}
    <section class="card results-section">
      <div class="section-heading">
        <h2><Calculator size={20} class="heading-icon" /> Tabulka četností</h2>
      </div>
      <div class="table-wrapper scrollable">
        <table class="modern-table result-table">
          <thead>
            <tr>
              <th><i>x<sub>i</sub></i></th>
              <th><i>n<sub>i</sub></i></th>
              <th><i>x<sub>i</sub>&middot;n<sub>i</sub></i></th>
              <th>|<i>x<sub>i</sub>&minus;x&#772;</i>|</th>
              <th>|<i>x<sub>i</sub>&minus;x&#772;</i>|&middot;<i>n<sub>i</sub></i></th>
              <th>(<i>x<sub>i</sub>&minus;x&#772;</i>)<sup>2</sup></th>
              <th>(<i>x<sub>i</sub>&minus;x&#772;</i>)<sup>2</sup>&middot;<i>n<sub>i</sub></i></th>
            </tr>
          </thead>
          <tbody>
            {#each tableData as row}
              <tr>
                <td class="fw-500">{row.x}</td>
                <td class="fw-500 text-blue">{row.n}</td>
                <td>{format(row.xn)}</td>
                <td>{format(row.absDev)}</td>
                <td>{format(row.absDevN)}</td>
                <td>{format(row.sqDev)}</td>
                <td>{format(row.sqDevN)}</td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="sum-row">
              <td><strong>Σ</strong></td>
              <td class="text-blue"><strong>{totalN}</strong></td>
              <td><strong>{format(sumXN)}</strong></td>
              <td>-</td>
              <td><strong>{format(sumAbsDevN)}</strong></td>
              <td>-</td>
              <td><strong>{format(sumSqDevN)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <section class="card stats-section">
      <div class="section-heading">
        <h2><TrendingUp size={20} class="heading-icon" /> Charakteristiky</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label"><Hash size={14} /> Rozsah (<i>n</i>)</span>
          <span class="stat-value text-blue">{totalN}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Calculator size={14} /> Průměr (<i>x&#772;</i>)</span>
          <span class="stat-value">{format(mean)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><SplitSquareHorizontal size={14} /> Medián (<i>x&#771;</i>)</span>
          <span class="stat-value">{format(median)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Target size={14} /> Modus (<i>x&#770;</i>)</span>
          <span class="stat-value">{mode.join(', ')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Diff size={14} /> Prům. odch. (<i>d&#772;</i>)</span>
          <span class="stat-value">{format(meanAbsDev)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Activity size={14} /> Rozptyl (<i>s<sub>x</sub></i><sup>2</sup>)</span>
          <span class="stat-value">{format(variance)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><TrendingUp size={14} /> Směr. odch. (<i>s<sub>x</sub></i>)</span>
          <span class="stat-value">{format(stdDev)}</span>
        </div>
        <div class="stat-card highlight-card">
          <span class="stat-label"><Percent size={14} /> Variační koef.</span>
          <span class="stat-value text-white">{format(coefVar)} %</span>
        </div>
      </div>
    </section>

    <section class="charts-container">
      <div class="card chart-box">
        <div class="section-heading">
          <h3><PieChart size={18} class="heading-icon" /> Podíl hodnot</h3>
        </div>
        <div class="canvas-wrapper"><canvas bind:this={pieCanvas}></canvas></div>
      </div>
      <div class="card chart-box">
        <div class="section-heading">
          <h3><LineChart size={18} class="heading-icon" /> Polygon četností</h3>
        </div>
        <div class="canvas-wrapper"><canvas bind:this={lineCanvas}></canvas></div>
      </div>
    </section>

    <section class="print-only page-break test-page">
      <header class="page-header-print">
        <h1>Statistika - Písemná práce</h1>
        <p>Jméno: _________________________________ Třída: _______ Datum: _________</p>
      </header>
      <div class="print-content">
        <h3>Zadané hodnoty:</h3>
        <p class="raw-data-print">{rawInput}</p>
        
        <h3>Úkol 1: Sestavte tabulku četností</h3>
        <table class="modern-table empty-test-table">
            <thead><tr><th><i>x<sub>i</sub></i></th><th><i>n<sub>i</sub></i></th><th><i>x<sub>i</sub> &middot; n<sub>i</sub></i></th><th>|<i>x<sub>i</sub> &minus; x&#772;</i>|</th><th>...</th><th>...</th><th>...</th></tr></thead>
            <tbody>{#each Array(8) as _}<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>{/each}</tbody>
            <tfoot><tr class="sum-row"><td><strong>Σ</strong></td><td></td><td></td><td>-</td><td></td><td>-</td><td></td></tr></tfoot>
        </table>

        <h3>Úkol 2: Vypočítejte charakteristiky</h3>
        <div class="stats-grid-print">
          {#each Array(8) as _}<div class="print-empty-box"></div>{/each}
        </div>
      </div>
    </section>

  {:else}
    <div class="empty-state">
      <Database size={40} strokeWidth={1.5} color="#cbd5e1" />
      <p>Vložte data pro zahájení výpočtů.</p>
    </div>
  {/if}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :global(body) { 
    font-family: 'Inter', sans-serif; 
    background-color: #f8fafc; 
    color: #0f172a; 
    margin: 0; 
    padding: 0; 
    line-height: 1.5;
  }

  .app-container { 
    max-width: 1100px; 
    margin: 0 auto; 
    padding: 24px 16px; 
  }

  .page-header { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 24px; 
    gap: 16px;
    flex-wrap: wrap;
  }

  .title-with-icon { display: flex; align-items: center; gap: 12px; }
  .title-with-icon h1 { font-size: 1.5rem; margin: 0; font-weight: 700; }
  .header-text p { color: #64748b; margin: 4px 0 0 0; font-size: 0.9rem; }

  .btn-export { 
    display: flex; align-items: center; gap: 8px; 
    background: #3b82f6; color: white; border: none; 
    padding: 10px 16px; font-weight: 600; border-radius: 10px; 
    cursor: pointer; font-size: 0.9rem;
    transition: transform 0.1s;
  }
  .btn-export:active { transform: scale(0.98); }

  .card { 
    background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; 
    padding: 20px; margin-bottom: 24px; 
    box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
  }

  .section-heading { margin-bottom: 16px; }
  .section-heading h2, .section-heading h3 { 
    display: flex; align-items: center; gap: 8px; 
    font-size: 1.1rem; font-weight: 600; margin: 0; 
  }
  .subtitle { color: #64748b; font-size: 0.85rem; margin: 4px 0 0 0; }
  .heading-icon { color: #94a3b8; }

  .table-wrapper { border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .scrollable { overflow-x: auto; }

  textarea { 
    width: 100%; height: 120px; border: none; padding: 16px; 
    font-family: monospace; font-size: 1rem; box-sizing: border-box; 
    resize: vertical; display: block;
  }
  textarea:focus { outline: none; background: #f0f9ff; }

  .modern-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .modern-table th { 
    background-color: #f8fafc; padding: 12px; 
    border-bottom: 1px solid #e2e8f0; color: #475569; 
    font-weight: 600; text-align: center;
  }
  .modern-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center; }
  .sum-row { background-color: #f8fafc; border-top: 2px solid #e2e8f0; font-weight: 700; }

  .stats-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); 
    gap: 12px; 
  }
  .stat-card { 
    background: #f8fafc; border: 1px solid #e2e8f0; 
    border-radius: 12px; padding: 16px; 
  }
  .highlight-card { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; }
  .stat-label { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
  .highlight-card .stat-label { color: #bfdbfe; }
  .stat-value { font-size: 1.2rem; font-weight: 700; }

  .charts-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
  .canvas-wrapper { height: 280px; position: relative; }

  .empty-state { text-align: center; padding: 40px; color: #94a3b8; }

  /* MOBILNÍ ÚPRAVY */
  @media (max-width: 640px) {
    .app-container { padding: 16px 12px; }
    .page-header { flex-direction: column; align-items: flex-start; }
    .btn-export { width: 100%; justify-content: center; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .modern-table { font-size: 0.8rem; }
    .stat-value { font-size: 1rem; }
    .card { padding: 16px; }
  }

  /* TISK */
  @media screen { .print-only { display: none !important; } }
  @media print {
    @page { size: A4; margin: 15mm; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { background-color: white; padding: 0; }
    .page-break { break-before: page; }
    .page-header-print { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .raw-data-print { background: #eee; padding: 10px; font-size: 0.9rem; }
    .modern-table th, .modern-table td { border: 1px solid #ccc; padding: 8px; }
    .stats-grid-print { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .print-empty-box { border: 1px solid #ccc; height: 50px; }
  }
</style>