<script>
  import Chart from 'chart.js/auto';
  import { 
    Trash2, Printer, BarChart3, Table2, Calculator, 
    TrendingUp, PieChart, LineChart, Hash, Target, 
    Activity, Percent, Database, SplitSquareHorizontal, Diff
  } from 'lucide-svelte';

  // Jedno velké pole pro syrová data (vložíš tam všechna čísla naráz)
  let rawInput = $state(`16 17 18 15 22 18 19 17 16 16
15 15 17 19 22 22 16 18 16 15
19 19 19 16 17 15 15 15 20 20
22 16 22 16 19 20 19 15 15 22
16 22 22 18 19 15 19 21 22 16
18 20 15 16 19 16 17 19 18 22`);

  let validDataRows = $state([]); // Pro tisk testu (tabulka x_i a n_i)
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
    // 1. Zpracování syrového vstupu na pole čísel
    let numbers = rawInput.split(/[\s,]+/).map(num => parseFloat(num)).filter(num => !isNaN(num));
    
    if (numbers.length === 0) {
      tableData = []; totalN = 0; mean = 0; median = 0; mode = [];
      meanAbsDev = 0; variance = 0; stdDev = 0; coefVar = 0;
      if (pieChart) pieChart.destroy();
      if (lineChart) lineChart.destroy();
      return;
    }

    // 2. AUTOMATICKÝ VÝPOČET ČETNOSTÍ
    let freqMap = {};
    numbers.forEach(num => {
      freqMap[num] = (freqMap[num] || 0) + 1;
    });

    // Převedeme na pole objektů a seřadíme podle hodnoty x
    let validRows = Object.keys(freqMap).map(key => ({
      x: parseFloat(key),
      n: freqMap[key]
    })).sort((a, b) => a.x - b.x);

    validDataRows = validRows;

    // 3. STATISTICKÉ VÝPOČTY
    let sortedNumbers = [...numbers].sort((a, b) => a - b);
    let _totalN = numbers.length;
    let _sumXN = numbers.reduce((a, b) => a + b, 0);
    let _mean = _sumXN / _totalN;

    // Modus
    let maxFreq = Math.max(...Object.values(freqMap));
    mode = Object.keys(freqMap).filter(x => freqMap[x] === maxFreq).map(Number);

    // Medián
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
            position: 'right', 
            labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 13, weight: '500' } }
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
  <header class="page-header">
    <div class="header-text">
      <div class="title-with-icon">
        <BarChart3 size={36} class="text-blue" strokeWidth={2.5} />
        <h1>Statistický analyzátor</h1>
      </div>
      <p>Moderní nástroj pro bleskové zpracování rozdělení četností.</p>
    </div>
    {#if tableData.length > 0}
      <button class="btn-export no-print" onclick={printPDF}>
        <Printer size={20} strokeWidth={2.5} />
        Exportovat PDF
      </button>
    {/if}
  </header>
  
  <section class="card input-section no-print">
    <div class="section-heading">
      <h2><Database size={24} class="heading-icon" /> Syrová data</h2>
      <p class="subtitle">Vložte všechna čísla souboru (oddělená mezerou, čárkou nebo novým řádkem).</p>
    </div>
    
    <div class="table-wrapper">
      <textarea bind:value={rawInput} placeholder="Sem vložte všechna čísla..."></textarea>
    </div>
  </section>

  {#if tableData.length > 0}
    <section class="card results-section">
      <div class="section-heading">
        <h2><Calculator size={24} class="heading-icon" /> Výpočtová tabulka četností</h2>
      </div>
      <div class="table-wrapper">
        <table class="modern-table result-table">
          <thead>
            <tr>
              <th><i>x<sub>i</sub></i></th>
              <th><i>n<sub>i</sub></i></th>
              <th><i>x<sub>i</sub> &middot; n<sub>i</sub></i></th>
              <th>|<i>x<sub>i</sub> &minus; x&#772;</i>|</th>
              <th>|<i>x<sub>i</sub> &minus; x&#772;</i>| &middot; <i>n<sub>i</sub></i></th>
              <th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup></th>
              <th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup> &middot; <i>n<sub>i</sub></i></th>
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
        <h2><TrendingUp size={24} class="heading-icon" /> Charakteristiky</h2>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label"><Hash size={16} /> Rozsah (<i>n</i>)</span>
          <span class="stat-value text-blue">{totalN}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Calculator size={16} /> Průměr (<i>x&#772;</i>)</span>
          <span class="stat-value">{format(mean)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><SplitSquareHorizontal size={16} /> Medián (<i>x&#771;</i>)</span>
          <span class="stat-value">{format(median)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Target size={16} /> Modus (<i>x&#770;</i>)</span>
          <span class="stat-value">{mode.join(', ')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Diff size={16} /> Prům. odchylka (<i>d&#772;</i>)</span>
          <span class="stat-value">{format(meanAbsDev)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><Activity size={16} /> Rozptyl (<i>s<sub>x</sub></i><sup>2</sup>)</span>
          <span class="stat-value">{format(variance)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label"><TrendingUp size={16} /> Směr. odchylka (<i>s<sub>x</sub></i>)</span>
          <span class="stat-value">{format(stdDev)}</span>
        </div>
        <div class="stat-card highlight-card">
          <span class="stat-label"><Percent size={16} /> Variační koeficient</span>
          <span class="stat-value text-white">{format(coefVar)} %</span>
        </div>
      </div>
    </section>

    <section class="charts-container">
      <div class="card chart-box">
        <div class="section-heading">
          <h3><PieChart size={20} class="heading-icon" /> Podíl hodnot</h3>
        </div>
        <div class="canvas-wrapper"><canvas bind:this={pieCanvas}></canvas></div>
      </div>
      <div class="card chart-box">
        <div class="section-heading">
          <h3><LineChart size={20} class="heading-icon" /> Polygon četností</h3>
        </div>
        <div class="canvas-wrapper"><canvas bind:this={lineCanvas}></canvas></div>
      </div>
    </section>

    <section class="print-only page-break test-page">
      <header class="page-header" style="margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px;">
        <h1>Statistika - Písemná práce</h1>
        <p>Jméno a příjmení: _________________________________________ Třída: _______</p>
      </header>
      <div class="section-heading"><h2>Zadané hodnoty</h2></div>
      <p style="font-size: 1.1rem; line-height: 1.6; background: #f8fafc; padding: 20px; border-radius: 8px;">{rawInput}</p>
      
      <div class="section-heading"><h2>Úkol 1: Sestavte tabulku četností a vypočítejte ji</h2></div>
      <div class="table-wrapper"><table class="modern-table result-table empty-test-table">
          <thead><tr><th><i>x<sub>i</sub></i></th><th><i>n<sub>i</sub></i></th><th><i>x<sub>i</sub> &middot; n<sub>i</sub></i></th><th>|<i>x<sub>i</sub> &minus; x&#772;</i>|</th><th>|<i>x<sub>i</sub> &minus; x&#772;</i>| &middot; <i>n<sub>i</sub></i></th><th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup></th><th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup> &middot; <i>n<sub>i</sub></i></th></tr></thead>
          <tbody>{#each Array(8) as _}<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>{/each}</tbody>
          <tfoot><tr class="sum-row"><td><strong>Σ</strong></td><td></td><td></td><td>-</td><td></td><td>-</td><td></td></tr></tfoot>
      </table></div>
      <div class="section-heading"><h2>Úkol 2: Charakteristiky</h2></div>
      <div class="stats-grid">{#each Array(8) as _}<div class="stat-card empty-stat"></div>{/each}</div>
      <div class="section-heading"><h2>Úkol 3: Grafy</h2></div>
      <div class="charts-container">
        <div><h3>Kruhový diagram</h3><div class="card chart-box" style="height: 300px; border: 2px dashed #cbd5e1;"></div></div>
        <div><h3>Spojnicový diagram</h3><div class="card chart-box" style="height: 300px; border: 2px dashed #cbd5e1;"></div></div>
      </div>
    </section>

  {:else}
    <div class="empty-state">
      <div class="empty-icon"><Database size={48} strokeWidth={1.5} color="#cbd5e1" /></div>
      <h3>Vložte data...</h3>
    </div>
  {/if}
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  :global(body) { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
  .app-container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
  .title-with-icon { display: flex; align-items: center; gap: 12px; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .btn-export { display: flex; align-items: center; gap: 10px; background: #3b82f6; color: white; border: none; padding: 12px 24px; font-weight: 600; border-radius: 12px; cursor: pointer; }
  .card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
  textarea { width: 100%; height: 150px; border: none; padding: 20px; font-family: monospace; font-size: 1rem; box-sizing: border-box; resize: vertical; }
  textarea:focus { outline: none; background: #f0f9ff; }
  .modern-table { width: 100%; border-collapse: collapse; text-align: center; }
  .modern-table th { background-color: #f8fafc; padding: 14px; border-bottom: 1px solid #e2e8f0; font-size: 0.85rem; color: #475569; }
  .modern-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
  .sum-row { background-color: #f8fafc; border-top: 2px solid #e2e8f0; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
  .highlight-card { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; }
  .stat-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #64748b; margin-bottom: 8px; }
  .highlight-card .stat-label { color: #bfdbfe; }
  .stat-value { font-size: 1.5rem; font-weight: 700; }
  .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .canvas-wrapper { height: 300px; position: relative; }
  @media screen { .print-only { display: none !important; } }
  @media print {
    @page { size: A4; margin: 15mm; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    body { background-color: white; padding: 10mm; }
    .page-break { break-before: page; }
    .empty-test-table td { height: 35px; }
    .empty-stat { height: 60px; border: 1px solid #cbd5e1; }
  }
</style>