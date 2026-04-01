<script>
  import Chart from 'chart.js/auto';
  // Importujeme pořádnou dávku nových ikon!
  import { 
    Trash2, Printer, BarChart3, Table2, Calculator, 
    TrendingUp, PieChart, LineChart, Hash, Target, 
    Activity, Percent, Database, SplitSquareHorizontal, Diff
  } from 'lucide-svelte';

  let inputRows = $state([
    { x: '', n: '' }
  ]);

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

  function handleInput(index) {
    if (index === inputRows.length - 1) {
      const row = inputRows[index];
      if (row.x !== '' || row.n !== '') {
        inputRows.push({ x: '', n: '' });
      }
    }
  }

  function removeRow(index) {
    if (inputRows.length > 1) {
      inputRows.splice(index, 1);
    } else {
      inputRows[0] = { x: '', n: '' };
    }
  }

  function calculateStats() {
    let validRows = inputRows
      .map(r => ({ x: parseFloat(r.x), n: parseInt(r.n) }))
      .filter(r => !isNaN(r.x) && !isNaN(r.n) && r.n > 0);

    validDataRows = validRows;

    if (validRows.length === 0) {
      tableData = []; totalN = 0; mean = 0; median = 0; mode = [];
      meanAbsDev = 0; variance = 0; stdDev = 0; coefVar = 0;
      if (pieChart) pieChart.destroy();
      if (lineChart) lineChart.destroy();
      return;
    }

    validRows.sort((a, b) => a.x - b.x);

    let _totalN = 0, _sumXN = 0;
    let _modeData = { maxFreq: 0, values: [] };
    let expandedArray = [];

    validRows.forEach(row => {
      _totalN += row.n;
      _sumXN += (row.x * row.n);
      
      if (row.n > _modeData.maxFreq) {
        _modeData.maxFreq = row.n;
        _modeData.values = [row.x];
      } else if (row.n === _modeData.maxFreq) {
        _modeData.values.push(row.x);
      }

      for (let i = 0; i < row.n; i++) expandedArray.push(row.x);
    });

    let _mean = _sumXN / _totalN;
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
    coefVar = (stdDev / _mean) * 100; mode = _modeData.values;

    if (_totalN % 2 !== 0) {
      median = expandedArray[Math.floor(_totalN / 2)];
    } else {
      median = (expandedArray[(_totalN / 2) - 1] + expandedArray[_totalN / 2]) / 2;
    }

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
          },
          tooltip: { callbacks: { label: function(context) { return ` Četnost: ${context.parsed}`; } } }
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
          pointBorderWidth: 2, pointBorderColor: '#3b82f6', pointHoverRadius: 7
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
    let trigger = JSON.stringify(inputRows); 
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
      <p>Moderní nástroj pro zpracování tabulek rozdělení četností.</p>
    </div>
    {#if tableData.length > 0}
      <button class="btn-export no-print" onclick={printPDF}>
        <Printer size={20} strokeWidth={2.5} />
        Exportovat PDF (Výsledky + Test)
      </button>
    {/if}
  </header>
  
  <section class="card input-section no-print">
    <div class="section-heading">
      <h2><Table2 size={24} class="heading-icon" /> Vstupní data</h2>
      <p class="subtitle">Zadejte hodnoty po řádcích. Nový řádek se vytvoří automaticky.</p>
    </div>
    
    <div class="table-wrapper">
      <table class="modern-table input-table">
        <thead>
          <tr>
            <th>Hodnoty (<i>x<sub>i</sub></i>)</th>
            <th>Četnosti (<i>n<sub>i</sub></i>)</th>
            <th class="action-col"></th>
          </tr>
        </thead>
        <tbody>
          {#each inputRows as row, i}
            <tr class="input-row-hover">
              <td><input type="number" bind:value={row.x} oninput={() => handleInput(i)} placeholder="Zadejte číslo..." /></td>
              <td><input type="number" bind:value={row.n} oninput={() => handleInput(i)} placeholder="Zadejte počet..." /></td>
              <td class="action-cell">
                {#if i !== inputRows.length - 1 || inputRows.length === 1}
                  <button class="icon-btn delete-btn" onclick={() => removeRow(i)} title="Smazat řádek">
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  {#if tableData.length > 0}
    
    <section class="print-only print-header-section">
      <h2><Table2 size={24} class="heading-icon" /> Vstupní data k analýze</h2>
      <div class="table-wrapper">
        <table class="modern-table result-table">
          <thead>
            <tr><th>Hodnoty (<i>x<sub>i</sub></i>)</th><th>Četnosti (<i>n<sub>i</sub></i>)</th></tr>
          </thead>
          <tbody>
            {#each validDataRows as row}
              <tr><td class="fw-500">{row.x}</td><td class="fw-500 text-blue">{row.n}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="card results-section">
      <div class="section-heading">
        <h2><Calculator size={24} class="heading-icon" /> Výpočtová tabulka</h2>
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
        <h2><TrendingUp size={24} class="heading-icon" /> Hlavní charakteristiky</h2>
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

      <div class="section-heading">
        <h2>Zadané hodnoty</h2>
      </div>
      <div class="table-wrapper" style="margin-bottom: 30px; max-width: 400px;">
        <table class="modern-table result-table">
          <thead>
            <tr><th>Hodnoty (<i>x<sub>i</sub></i>)</th><th>Četnosti (<i>n<sub>i</sub></i>)</th></tr>
          </thead>
          <tbody>
            {#each validDataRows as row}
              <tr><td class="fw-500">{row.x}</td><td class="fw-500">{row.n}</td></tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="section-heading">
        <h2>Úkol 1: Vyplňte tabulku rozdělení četností</h2>
      </div>
      <div class="table-wrapper" style="margin-bottom: 40px;">
        <table class="modern-table result-table empty-test-table">
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
            {#each validDataRows as row}
              <tr>
                <td class="fw-500">{row.x}</td>
                <td class="fw-500">{row.n}</td>
                <td></td><td></td><td></td><td></td><td></td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="sum-row">
              <td><strong>Σ</strong></td><td></td><td></td><td>-</td><td></td><td>-</td><td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div class="section-heading">
        <h2>Úkol 2: Vypočítejte charakteristiky</h2>
      </div>
      <div class="stats-grid" style="margin-bottom: 40px;">
        <div class="stat-card empty-stat"><span class="stat-label">Rozsah (<i>n</i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Průměr (<i>x&#772;</i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Medián (<i>x&#771;</i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Modus (<i>x&#770;</i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Prům. odchylka (<i>d&#772;</i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Rozptyl (<i>s<sub>x</sub></i><sup>2</sup>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Směr. odchylka (<i>s<sub>x</sub></i>)</span><span class="stat-value"></span></div>
        <div class="stat-card empty-stat"><span class="stat-label">Variační koeficient</span><span class="stat-value"></span></div>
      </div>

      <div class="section-heading">
        <h2>Úkol 3: Sestrojte grafy</h2>
      </div>
      <div class="charts-container">
        <div>
          <h3 style="color: #1e293b; font-size: 1.1rem; margin-bottom: 12px; font-weight: 600;">Kruhový diagram</h3>
          <div class="card chart-box" style="height: 300px; border: 2px dashed #cbd5e1; box-shadow: none;"></div>
        </div>
        <div>
          <h3 style="color: #1e293b; font-size: 1.1rem; margin-bottom: 12px; font-weight: 600;">Spojnicový diagram</h3>
          <div class="card chart-box" style="height: 300px; border: 2px dashed #cbd5e1; box-shadow: none;"></div>
        </div>
      </div>
    </section>

  {:else}
    <div class="empty-state">
      <div class="empty-icon"><Database size={48} strokeWidth={1.5} color="#cbd5e1" /></div>
      <h3>Čekám na data...</h3>
      <p>Vyplňte alespoň jeden řádek v tabulce výše pro zobrazení výsledků.</p>
    </div>
  {/if}
</main>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :global(body) {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background-color: #f8fafc;
    color: #0f172a;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
  }

  .app-container { max-width: 1000px; margin: 0 auto; padding: 40px 20px 80px 20px; }

  .title-with-icon { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .title-with-icon h1 { margin: 0; }
  .section-heading h2 { display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 600; margin: 0 0 4px 0; color: #1e293b; }
  .section-heading h3 { display: flex; align-items: center; gap: 8px; font-size: 1.1rem; font-weight: 600; margin: 0; color: #1e293b; }
  .heading-icon { color: #64748b; }
  
  .page-header { 
    display: flex; justify-content: space-between; align-items: center; 
    margin-bottom: 32px; flex-wrap: wrap; gap: 20px;
  }
  .header-text h1 { font-size: 2.25rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
  .header-text p { color: #64748b; font-size: 1.1rem; margin: 0; }

  .btn-export {
    display: flex; align-items: center; gap: 10px; background: #3b82f6; color: white;
    border: none; padding: 12px 24px; font-size: 1rem; font-weight: 600;
    border-radius: 12px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4);
    transition: all 0.2s ease;
  }
  .btn-export:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 6px 8px -1px rgba(59, 130, 246, 0.5); }

  .card {
    background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px;
    margin-bottom: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: box-shadow 0.3s ease;
  }
  .card:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }

  .section-heading { margin-bottom: 24px; }
  .subtitle { color: #64748b; font-size: 0.9rem; margin: 0; padding-left: 34px; }

  .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e2e8f0; }
  .modern-table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
  .modern-table th { background-color: #f8fafc; color: #475569; font-weight: 600; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 20px; border-bottom: 1px solid #e2e8f0; }
  .modern-table td { padding: 12px 20px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
  .modern-table tbody tr:last-child td { border-bottom: none; }

  .input-table td { padding: 0; }
  .input-table input { width: 100%; border: none; padding: 16px 20px; font-family: inherit; font-size: 1rem; color: #0f172a; background: transparent; transition: background-color 0.2s; box-sizing: border-box;}
  .input-table input:focus { outline: none; background-color: #f0f9ff; box-shadow: inset 2px 0 0 #3b82f6; }
  .input-table input::placeholder { color: #cbd5e1; }
  .input-row-hover:hover { background-color: #f8fafc; }

  .result-table { text-align: center; }
  .result-table th { text-align: center; }
  .result-table tbody tr:hover { background-color: #f8fafc; }
  
  .sum-row { background-color: #f8fafc; border-top: 2px solid #e2e8f0; }
  .sum-row td { font-size: 1.05rem; color: #0f172a; }

  .fw-500 { font-weight: 500; }
  .text-blue { color: #3b82f6 !important; }
  .text-white { color: #ffffff !important; }

  .action-col { width: 60px; }
  .action-cell { text-align: center !important; }
  
  .icon-btn { background: transparent; border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 8px; border-radius: 8px; color: #94a3b8; transition: all 0.2s ease; }
  .delete-btn:hover { color: #ef4444; background-color: #fee2e2; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: center; transition: transform 0.2s; }
  .stat-card:hover { transform: translateY(-2px); border-color: #cbd5e1; }
  
  .highlight-card { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3); }
  .highlight-card .stat-label { color: #bfdbfe; }
  
  .stat-label { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #64748b; font-weight: 500; margin-bottom: 8px; }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: #0f172a; line-height: 1.2; }

  .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .chart-box { margin-bottom: 0; }
  .canvas-wrapper { height: 300px; position: relative; width: 100%; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; background: transparent; border: 2px dashed #cbd5e1; border-radius: 16px; color: #64748b; }
  .empty-icon { margin-bottom: 16px; }
  .empty-state h3 { margin: 0 0 8px 0; color: #475569; }

  @media screen { .print-only { display: none !important; } }

  /* ============================================== */
  /* RESPONZIVITA PRO MOBILY A TABLETY              */
  /* ============================================== */
  @media (max-width: 768px) {
    .app-container { padding: 20px 12px 60px 12px; }
    
    .page-header { flex-direction: column; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
    .header-text h1 { font-size: 1.75rem; }
    .title-with-icon .lucide { width: 28px; height: 28px; }
    
    /* Tlačítko pro export přes celou šířku obrazovky */
    .btn-export { width: 100%; justify-content: center; padding: 14px; }
    
    .card { padding: 16px; border-radius: 12px; margin-bottom: 20px; }
    
    .section-heading h2 { font-size: 1.1rem; }
    .subtitle { padding-left: 0; margin-top: 4px; }
    
    /* Zúžení buněk, aby se toho na obrazovku vešlo víc */
    .modern-table th, .modern-table td { padding: 10px 8px; font-size: 0.85rem; }
    
    /* Důležité: font-size 16px zamezí automatickému zoomování na iOS */
    .input-table input { padding: 12px 8px; font-size: 16px; }
    .action-col { width: 40px; }
    .icon-btn { padding: 6px; }

    /* Výsledkové karty do 2 sloupců, aby se netáhly přes celou obrazovku */
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat-card { padding: 12px; }
    .stat-label { font-size: 0.75rem; gap: 4px; }
    .stat-label .lucide { width: 14px; height: 14px; }
    .stat-value { font-size: 1.25rem; }

    /* Grafy pod sebe */
    .charts-container { grid-template-columns: 1fr; gap: 24px; }
  }

  /* ============================================== */
  /* TISKOVÉ STYLY                                  */
  /* ============================================== */
  @media print {
    @page { size: A4; margin: 15mm; }

    .no-print { display: none !important; }
    .print-only { display: block !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    body { background-color: white; }
    .app-container { max-width: 100%; padding: 0; }
    .card { box-shadow: none; border: none; padding: 0; margin-bottom: 30px; }
    
    tr, .stat-card, .chart-box, .section-heading { page-break-inside: avoid; break-inside: avoid; }
    .page-break { break-before: page; page-break-before: always; padding-top: 0; }

    .empty-test-table td { height: 35px; }
    .empty-stat { height: 70px; background: white; border: 1px solid #cbd5e1; }
  }
</style>