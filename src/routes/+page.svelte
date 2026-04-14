<script>
  import { onMount, untrack } from 'svelte';
  import Chart from 'chart.js/auto';
  import ChartDataLabels from 'chartjs-plugin-datalabels';
  import Tesseract from 'tesseract.js';
  import { 
    Trash2, Printer, BarChart3, Table2, Calculator, 
    TrendingUp, PieChart, LineChart, Hash, Target, 
    Activity, Percent, Database, FileSpreadsheet, FileText, 
    Download, History, Camera, Loader2, AlignCenter, Diff,
    PaintBucket
  } from 'lucide-svelte';

  Chart.register(ChartDataLabels);

  let rawInput = $state("");
  let history = $state([]);
  let isScanning = $state(false);
  let isHistoryModalOpen = $state(false);
  
  // Přepínač stylů teď má hodnoty 'badge' (odznak) nebo 'row' (celý řádek)
  let rowColorMode = $state('badge'); 

  let validDataRows = $state([]);
  let tableData = $state([]);
  let totalN = $state(0), mean = $state(0), median = $state(0), mode = $state([]);
  let meanAbsDev = $state(0), variance = $state(0), stdDev = $state(0), coefVar = $state(0);
  let sumXN = $state(0), sumAbsDevN = $state(0), sumSqDevN = $state(0);

  let pieCanvas = $state();
  let lineCanvas = $state();
  let pieChart, lineChart;

  const baseColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#fb923c', '#a855f7'];

  function format(num, decimals = 3) {
    if (num === null || isNaN(num)) return '-';
    return Number(num).toLocaleString('cs-CZ', { maximumFractionDigits: decimals });
  }

  function exportCSV() {
    let csv = "xi;ni;xi*ni;abs_dev;abs_dev*ni;sq_dev;sq_dev*ni\n";
    tableData.forEach(r => {
      csv += `${r.x};${r.n};${r.xn};${r.absDev};${r.absDevN};${r.sqDev};${r.sqDevN}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "statistika_data.csv";
    link.click();
  }

  function exportWord() {
    const pieImgUrl = pieCanvas ? pieCanvas.toDataURL('image/png') : '';
    const lineImgUrl = lineCanvas ? lineCanvas.toDataURL('image/png') : '';
    const tableHTML = document.querySelector('.modern-table').outerHTML;

    const wordStyles = `
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; color: #000; line-height: 1.5; }
        h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        h2 { color: #1e293b; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
        p.raw-data { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; font-family: monospace; word-wrap: break-word; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11pt; text-align: center; }
        th, td { border: 1pt solid #94a3b8; padding: 8px; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .sum-row { background-color: #e2e8f0; font-weight: bold; }
        ul { list-style-type: none; padding: 0; }
        li { padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
        strong { color: #3b82f6; }
        img { max-width: 100%; height: auto; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto; }
        /* Ve Wordu zrušíme styly odznaků, aby to byla čistá tabulka */
        .value-badge { background: none !important; border: none !important; color: #000 !important; font-weight: bold; }
      </style>
    `;

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Statistická analýza</title>
        ${wordStyles}
      </head>
      <body>
        <h1>Zpráva o statistické analýze</h1>
        <h2>1. Vstupní zadaná data</h2>
        <p class="raw-data">${rawInput}</p>
        <h2>2. Tabulka rozdělení četností</h2>
        ${tableHTML}
        <h2>3. Vypočítané charakteristiky</h2>
        <ul>
          <li><strong>Rozsah (n):</strong> ${totalN}</li>
          <li><strong>Průměr:</strong> ${format(mean)}</li>
          <li><strong>Medián:</strong> ${format(median)}</li>
          <li><strong>Modus:</strong> ${mode.join(', ')}</li>
          <li><strong>Rozptyl:</strong> ${format(variance)}</li>
          <li><strong>Směrodatná odchylka:</strong> ${format(stdDev)}</li>
          <li><strong>Variační koeficient:</strong> ${format(coefVar)} %</li>
        </ul>
        <h2>4. Grafické znázornění</h2>
        ${pieImgUrl ? `<h3>Kruhový diagram</h3><img src="${pieImgUrl}" width="500" />` : ''}
        <br>
        ${lineImgUrl ? `<h3>Polygon četností</h3><img src="${lineImgUrl}" width="500" />` : ''}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "statisticka_analyza.doc";
    link.click();
  }

  function printPDF() { window.print(); }

  async function handlePhoto(event) {
    const file = event.target.files[0];
    if (!file) return;
    isScanning = true;
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng+ces');
      const foundNumbers = text.match(/\d+/g);
      if (foundNumbers) {
        rawInput = foundNumbers.join(" ");
      } else {
        alert("Na obrázku se nenašla žádná čísla.");
      }
    } catch (e) {
      alert("Chyba při čtení obrázku. Zkuste to znovu.");
    } finally {
      isScanning = false;
    }
  }

  function calculateStats() {
    let numbers = rawInput.split(/[\s,;]+/).map(num => parseFloat(num)).filter(num => !isNaN(num));
    
    if (numbers.length === 0) {
      tableData = []; totalN = 0;
      if (pieChart) pieChart.destroy();
      if (lineChart) lineChart.destroy();
      return;
    }

    let freqMap = {};
    numbers.forEach(num => { freqMap[num] = (freqMap[num] || 0) + 1; });
    let sortedKeys = Object.keys(freqMap).map(Number).sort((a, b) => a - b);
    
    let _totalN = numbers.length;
    let _sumXN = numbers.reduce((a, b) => a + b, 0);
    let _mean = _sumXN / _totalN;

    tableData = sortedKeys.map((x, i) => {
      let n = freqMap[x];
      let absDev = Math.abs(x - _mean);
      return {
        x, n, xn: x * n,
        absDev, absDevN: absDev * n,
        sqDev: Math.pow(x - _mean, 2),
        sqDevN: Math.pow(x - _mean, 2) * n,
        color: baseColors[i % baseColors.length]
      };
    });

    validDataRows = tableData.map(r => ({ x: r.x, n: r.n }));
    totalN = _totalN; mean = _mean; sumXN = _sumXN;
    
    sumAbsDevN = tableData.reduce((s, r) => s + r.absDevN, 0);
    sumSqDevN = tableData.reduce((s, r) => s + r.sqDevN, 0);
    
    meanAbsDev = sumAbsDevN / totalN;
    variance = sumSqDevN / totalN;
    stdDev = Math.sqrt(variance);
    coefVar = (stdDev / mean) * 100;

    let maxF = Math.max(...Object.values(freqMap));
    mode = sortedKeys.filter(x => freqMap[x] === maxF);
    
    let sNums = [...numbers].sort((a, b) => a - b);
    median = _totalN % 2 !== 0 ? sNums[Math.floor(_totalN/2)] : (sNums[_totalN/2 - 1] + sNums[_totalN/2]) / 2;

    updateCharts();
    saveToHistory();
  }

  function updateCharts() {
    if (!pieCanvas || !lineCanvas) return;
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    const labels = tableData.map(r => r.x);
    const data = tableData.map(r => r.n);
    const colors = tableData.map(r => r.color);

    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCanvas, {
      type: 'doughnut',
      data: {
        labels: labels.map(l => `Hodnota ${l}`),
        datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          datalabels: {
            display: true,
            color: '#ffffff',
            font: { weight: 'bold', size: 14 },
            formatter: (value) => value > 0 ? value : ""
          }
        }
      }
    });

    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{ 
          label: 'Četnost', data, borderColor: '#3b82f6', tension: 0.4, 
          fill: true, backgroundColor: 'rgba(59,130,246,0.1)',
          pointBackgroundColor: '#ffffff', pointBorderColor: '#3b82f6', pointBorderWidth: 2
        }]
      },
      options: { 
        animation: false,
        responsive: true, maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
        plugins: { datalabels: { display: false } }
      }
    });
  }

  let debounceTimer;
  function saveToHistory() {
    if (!rawInput || rawInput.trim() === "") return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      let currentHistory = JSON.parse(localStorage.getItem('stat_history') || "[]");
      if (currentHistory[0] === rawInput) return;
      currentHistory.unshift(rawInput);
      history = currentHistory.slice(0, 10);
      localStorage.setItem('stat_history', JSON.stringify(history));
    }, 2000);
  }

  onMount(() => {
    history = JSON.parse(localStorage.getItem('stat_history') || "[]");
    if (history.length > 0 && !rawInput) rawInput = history[0];
    calculateStats();
  });

  $effect(() => { 
    const trigger = rawInput; 
    untrack(() => { calculateStats(); });
  });
</script>

<main class="app-container">

  {#if isHistoryModalOpen}
    <div class="modal-backdrop" onclick={() => isHistoryModalOpen = false}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <div class="modal-header">
          <h2><History size={20} class="text-blue"/> Historie výpočtů</h2>
          <button class="btn-close" onclick={() => isHistoryModalOpen = false}><Trash2 size={20}/></button>
        </div>
        <div class="modal-body">
          {#if history.length === 0}
            <p class="empty-history">Zatím nemáte žádnou historii výpočtů.</p>
          {:else}
            <div class="history-list">
              {#each history as item}
                <button class="history-item" onclick={() => { rawInput = item; isHistoryModalOpen = false; }}>
                  <div class="history-preview">{item.substring(0, 60)}...</div>
                  <div class="history-meta">Položek: {item.split(/[\s,;]+/).filter(n => n).length}</div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <header class="page-header no-print">
    <div class="header-main">
      <BarChart3 size={38} class="text-blue" strokeWidth={2.5}/>
      <h1>Statistická analytika</h1>
    </div>
    
    {#if tableData.length > 0}
      <div class="action-bar">
        <button class="btn btn-primary" onclick={printPDF} title="Vytisknout PDF (vč. testu)"><Printer size={18}/> PDF</button>
        <button class="btn btn-secondary" onclick={exportCSV} title="Stáhnout tabulku"><FileSpreadsheet size={18}/> CSV</button>
        <button class="btn btn-secondary" onclick={exportWord} title="Stáhnout do Wordu"><FileText size={18}/> Word</button>
        <button class="btn btn-ghost" onclick={() => alert('Lze nainstalovat v prohlížeči (Chrome/Edge) přes adresní řádek.')} title="Instalovat appku"><Download size={18}/></button>
      </div>
    {/if}
  </header>

  <div class="grid-main">
    <section class="card input-card no-print">
      <div class="card-header">
        <div style="display:flex; align-items:center; gap: 8px;">
          <h2><Database size={20} class="heading-icon"/> Vstupní data</h2>
          <button class="btn-history-small" onclick={() => isHistoryModalOpen = true}>
            <History size={14}/> Historie
          </button>
        </div>
        <label class="btn-scan" class:loading={isScanning}>
          {#if isScanning}
            <Loader2 size={16} class="animate-spin"/> Zpracovávám...
          {:else}
            <Camera size={16}/> Skenovat fotku
          {/if}
          <input type="file" accept="image/*" onchange={handlePhoto} hidden disabled={isScanning} />
        </label>
      </div>
      <textarea bind:value={rawInput} placeholder="Vložte čísla oddělená mezerou, nebo nahrajte fotku..."></textarea>
    </section>

    <div class="results-content">
      {#if tableData.length > 0}
        <section class="card table-card print-section">
          <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
            <h2><Table2 size={20} class="heading-icon"/> Tabulka rozdělení četností</h2>
            <div class="toggle-group no-print">
              <span class="toggle-label"><PaintBucket size={14}/> Zvýraznění:</span>
              <button class="toggle-btn" class:active={rowColorMode === 'badge'} onclick={() => rowColorMode = 'badge'}>Odznak</button>
              <button class="toggle-btn" class:active={rowColorMode === 'row'} onclick={() => rowColorMode = 'row'}>Celý řádek</button>
            </div>
          </div>

          <div class="table-scroll-area">
            <table class="modern-table">
              <thead>
                <tr>
                  <th class="sticky-col col-1"><i>x<sub>i</sub></i> (Hodnota)</th>
                  <th class="sticky-col col-2"><i>n<sub>i</sub></i> (Četnost)</th>
                  <th><i>x<sub>i</sub> &middot; n<sub>i</sub></i></th>
                  <th>|<i>x<sub>i</sub> &minus; x&#772;</i>|</th>
                  <th>|<i>x<sub>i</sub> &minus; x&#772;</i>| &middot; <i>n<sub>i</sub></i></th>
                  <th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup></th>
                  <th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup> &middot; <i>n<sub>i</sub></i></th>
                </tr>
              </thead>
              <tbody>
                {#each tableData as row}
                  <tr style={rowColorMode === 'row' ? `background-color: ${row.color}15;` : ''}>
                    
                    <td class="sticky-col col-1" style={rowColorMode === 'row' ? `background-color: transparent; border-right: none !important;` : ''}>
                      {#if rowColorMode === 'badge'}
                        <span class="value-badge" style="background-color: {row.color}20; color: {row.color}; border-color: {row.color}40;">
                          {row.x}
                        </span>
                      {:else}
                        <span class="fw-bold">{row.x}</span>
                      {/if}
                    </td>
                    
                    <td class="sticky-col col-2 text-blue fw-bold" style={rowColorMode === 'row' ? `background-color: transparent; border-right: none !important;` : ''}>
                      {row.n}
                    </td>
                    
                    <td>{format(row.xn)}</td>
                    <td>{format(row.absDev)}</td>
                    <td>{format(row.absDevN)}</td>
                    <td>{format(row.sqDev)}</td>
                    <td>{format(row.sqDevN)}</td>
                  </tr>
                {/each}
              </tbody>
              <tfoot class="print-table-footer">
                <tr class="sum-row">
                  <td class="sticky-col col-1 text-right fw-bold">Suma Σ</td>
                  <td class="sticky-col col-2 text-blue fw-bold">{totalN}</td>
                  <td class="fw-bold">{format(sumXN)}</td>
                  <td>-</td>
                  <td class="fw-bold">{format(sumAbsDevN)}</td>
                  <td>-</td>
                  <td class="fw-bold">{format(sumSqDevN)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section class="stats-grid print-section">
          <div class="stat-card">
            <span class="l"><Hash size={14}/> Rozsah (<i>n</i>)</span>
            <span class="v text-blue">{totalN}</span>
          </div>
          <div class="stat-card highlight">
            <span class="l"><Calculator size={14}/> Průměr (<i>x&#772;</i>)</span>
            <span class="v">{format(mean)}</span>
          </div>
          <div class="stat-card">
            <span class="l"><AlignCenter size={14}/> Medián (<i>x&#771;</i>)</span>
            <span class="v">{format(median)}</span>
          </div>
          <div class="stat-card">
            <span class="l"><Target size={14}/> Modus (<i>x&#770;</i>)</span>
            <span class="v">{mode.join(', ')}</span>
          </div>
          <div class="stat-card">
            <span class="l"><Diff size={14}/> Prům. odch. (<i>d&#772;</i>)</span>
            <span class="v">{format(meanAbsDev)}</span>
          </div>
          <div class="stat-card">
            <span class="l"><Activity size={14}/> Rozptyl (<i>s<sub>x</sub></i><sup>2</sup>)</span>
            <span class="v">{format(variance)}</span>
          </div>
          <div class="stat-card">
            <span class="l"><TrendingUp size={14}/> Směr. odch. (<i>s<sub>x</sub></i>)</span>
            <span class="v">{format(stdDev)}</span>
          </div>
          <div class="stat-card">
            <span class="l"><Percent size={14}/> Variační koeficient</span>
            <span class="v">{format(coefVar)} %</span>
          </div>
        </section>

        <section class="charts-container print-section">
          <div class="card chart-box">
            <div class="card-header"><h3><PieChart size={18} class="heading-icon"/> Podíl hodnot</h3></div>
            <div class="canvas-wrapper"><canvas bind:this={pieCanvas}></canvas></div>
          </div>
          <div class="card chart-box">
            <div class="card-header"><h3><LineChart size={18} class="heading-icon"/> Polygon četností</h3></div>
            <div class="canvas-wrapper"><canvas bind:this={lineCanvas}></canvas></div>
          </div>
        </section>

        <section class="print-only page-break test-page">
          <header class="test-header">
            <h1>Statistika - Písemná práce</h1>
            <p>Jméno a příjmení: _________________________________________ Třída: _______</p>
          </header>
          
          <div class="section-heading"><h2>Zadané hodnoty</h2></div>
          <p class="raw-data-print">{rawInput}</p>
          
          <div class="section-heading"><h2>Úkol 1: Sestavte tabulku rozdělení četností</h2></div>
          <table class="modern-table empty-test-table">
            <thead>
              <tr><th><i>x<sub>i</sub></i></th><th><i>n<sub>i</sub></i></th><th><i>x<sub>i</sub> &middot; n<sub>i</sub></i></th><th>|<i>x<sub>i</sub> &minus; x&#772;</i>|</th><th>|<i>x<sub>i</sub> &minus; x&#772;</i>| &middot; <i>n<sub>i</sub></i></th><th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup></th><th>(<i>x<sub>i</sub> &minus; x&#772;</i>)<sup>2</sup> &middot; <i>n<sub>i</sub></i></th></tr>
            </thead>
            <tbody>
              {#each Array(10) as _}<tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>{/each}
            </tbody>
            <tfoot>
              <tr class="sum-row"><td><strong>Σ</strong></td><td></td><td></td><td>-</td><td></td><td>-</td><td></td></tr>
            </tfoot>
          </table>

          <div class="section-heading" style="margin-top: 30px;"><h2>Úkol 2: Vypočítejte charakteristiky</h2></div>
          <div class="stats-grid-print">
            {#each Array(8) as _}<div class="print-empty-box"></div>{/each}
          </div>

          <div class="section-heading" style="margin-top: 30px;"><h2>Úkol 3: Sestrojte grafy</h2></div>
          <div class="charts-container">
            <div><h3>Kruhový diagram</h3><div class="print-empty-chart"></div></div>
            <div><h3>Spojnicový diagram</h3><div class="print-empty-chart"></div></div>
          </div>
        </section>
      {:else}
        <div class="empty-state">
          <Database size={48} strokeWidth={1.5} color="#cbd5e1" />
          <h3>Zatím žádná data</h3>
          <p>Napište čísla, nebo zkuste nahrát obrázek.</p>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :global(body) { font-family: 'Inter', sans-serif; background: #f0f2f5; margin: 0; color: #1a1f36; line-height: 1.5; }
  .app-container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }

  /* ZÁHLAVÍ & TLAČÍTKA */
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .header-main { display: flex; align-items: center; gap: 1rem; }
  .header-main h1 { font-size: 1.8rem; margin: 0; font-weight: 700; letter-spacing: -0.5px; color: #0f172a; }
  .text-blue { color: #3b82f6; }
  .action-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  
  .btn { display: flex; align-items: center; gap: 8px; padding: 0.6rem 1.2rem; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
  .btn-primary { background: #3b82f6; color: white; box-shadow: 0 4px 6px -1px rgba(59,130,246,0.3); }
  .btn-secondary { background: white; border: 1px solid #e2e8f0; color: #475569; }
  .btn-ghost { background: transparent; color: #94a3b8; }
  .btn:hover { transform: translateY(-2px); filter: brightness(0.95); }

  /* KARTY & OBSAH */
  .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .card-header h2, .card-header h3 { font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px; color: #1e293b; }
  .heading-icon { color: #94a3b8; }

  /* VSTUP & OCR & HISTORIE */
  textarea { width: 100%; height: 120px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; font-family: monospace; font-size: 1rem; resize: vertical; box-sizing: border-box; }
  textarea:focus { outline: none; background: #f0f9ff; border-color: #3b82f6; }
  
  .btn-scan { background: #f8fafc; border: 1px dashed #cbd5e1; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; color: #475569; font-weight: 500; transition: 0.2s; }
  .btn-scan:hover { background: #f1f5f9; border-color: #94a3b8; }
  .btn-scan.loading { opacity: 0.6; cursor: wait; }
  .animate-spin { animation: spin 1s linear infinite; }
  @keyframes spin { 100% { transform: rotate(360deg); } }

  .btn-history-small { background: #f1f5f9; border: none; padding: 4px 10px; border-radius: 6px; color: #475569; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 4px; font-weight: 500; transition: 0.2s; }
  .btn-history-small:hover { background: #e2e8f0; color: #1e293b; }

  /* MODAL (VYSKAKOVACÍ OKNO HISTORIE) */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; box-sizing: border-box; }
  .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: slideUp 0.2s ease-out; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .modal-header h2 { margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; color: #0f172a; }
  .btn-close { background: transparent; border: none; color: #64748b; cursor: pointer; padding: 4px; display: flex; transition: 0.2s; border-radius: 6px; }
  .btn-close:hover { background: #f1f5f9; color: #ef4444; }
  .modal-body { padding: 1.5rem; max-height: 60vh; overflow-y: auto; }
  .empty-history { text-align: center; color: #64748b; margin: 0; }
  .history-list { display: flex; flex-direction: column; gap: 10px; }
  .history-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; cursor: pointer; text-align: left; transition: 0.2s; display: flex; flex-direction: column; gap: 4px; }
  .history-item:hover { background: #f0f9ff; border-color: #bfdbfe; }
  .history-preview { font-family: monospace; font-size: 0.9rem; color: #334155; word-break: break-all; }
  .history-meta { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

  /* PŘEPÍNAČ STYLU TABULKY */
  .toggle-group { display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; padding: 4px; gap: 4px; }
  .toggle-label { font-size: 0.8rem; color: #64748b; margin-right: 4px; padding-left: 4px; display: flex; align-items: center; gap: 4px; }
  .toggle-btn { background: transparent; border: none; padding: 4px 12px; font-size: 0.85rem; border-radius: 6px; color: #64748b; cursor: pointer; font-weight: 500; transition: 0.2s; }
  .toggle-btn:hover { color: #1e293b; }
  .toggle-btn.active { background: white; color: #3b82f6; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }

  /* TABULKA S FIXNÍMI SLOUPCI (DESKTOP) */
  .table-scroll-area { overflow-x: auto; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 100%; position: relative; }
  .modern-table { width: 100%; border-collapse: collapse; text-align: center; background: transparent; font-size: 0.9rem; }
  .modern-table th, .modern-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; transition: background-color 0.3s ease; }
  .modern-table th { background: #f8fafc; font-size: 0.8rem; text-transform: uppercase; color: #64748b; font-weight: 600; }
  
  .value-badge { display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; border-radius: 6px; font-weight: 700; min-width: 24px; border: 1px solid; }
  
  .sticky-col { position: sticky; background-color: white; z-index: 2; }
  .modern-table th.sticky-col { background-color: #f8fafc; z-index: 3; }
  .modern-table tfoot .sticky-col { background-color: #f8fafc; z-index: 3; }
  
  .col-1 { left: 0; min-width: 60px; }
  .col-2 { left: 100px; min-width: 60px; box-shadow: 4px 0 8px -2px rgba(0,0,0,0.06); border-right: 1px solid #e2e8f0; }
  
  .sum-row td { background: #f8fafc; border-top: 2px solid #e2e8f0; }
  .sticky-col-total { left: 0; box-shadow: 4px 0 8px -2px rgba(0,0,0,0.06); border-right: 1px solid #e2e8f0; }
  .fw-bold { font-weight: 600; }
  .text-right { text-align: right !important; }

  /* CHARAKTERISTIKY */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
  .stat-card { background: white; padding: 1.2rem; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: center; }
  .stat-card.highlight { background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; color: white; box-shadow: 0 4px 10px rgba(59,130,246,0.3); }
  .stat-card .l { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 500; }
  .stat-card.highlight .l { color: #bfdbfe; }
  .stat-card .v { font-size: 1.5rem; font-weight: 700; line-height: 1.2; }
  .stat-card.highlight .v { color: white; }

  /* GRAFY */
  .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; min-width: 0; }
  .chart-box { min-width: 0; overflow: hidden; }
  .canvas-wrapper { height: 300px; position: relative; width: 100%; min-width: 0; }

  .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1rem; color: #94a3b8; border: 2px dashed #cbd5e1; border-radius: 16px; text-align: center; }
  .empty-state h3 { color: #475569; margin: 1rem 0 0.5rem 0; }

  /* MOBILY A TABLETY (VYPNUTÍ KOTVY A RESPONZIVITA GRAFŮ) */
  @media (max-width: 768px) {
    .app-container { padding: 1rem; }
    .charts-container { grid-template-columns: 1fr; }
    .canvas-wrapper { height: 250px; }
    .page-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
    .action-bar { width: 100%; overflow-x: auto; padding-bottom: 5px; }
    .btn { flex: 1; justify-content: center; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .card-header { flex-direction: column; align-items: flex-start; gap: 12px; }
    
    /* Vypnutí zafixovaných sloupců na mobilech pro čistší scrollování */
    .sticky-col { position: static !important; box-shadow: none !important; border-right: none !important; background-color: transparent !important; }
    .modern-table th.sticky-col { background-color: #f8fafc !important; }
    .sticky-col-total { position: static !important; box-shadow: none !important; border-right: none !important; }
  }

  /* TISK A PDF */
  @media screen { .print-only { display: none !important; } }
  @media print {
    @page { size: A4; margin: 15mm; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    body { background: white; padding: 0; }
    .app-container { padding: 0; max-width: 100%; }
    .card { box-shadow: none; border: 1px solid #eee; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
    
    .sticky-col { position: static !important; box-shadow: none !important; border-right: none !important; background-color: transparent !important; }
    .table-scroll-area { border: none; overflow: visible; }
    .modern-table th, .modern-table td { border: 1px solid #cbd5e1; padding: 8px; }

    .page-break { break-before: page; page-break-before: always; padding-top: 10px; }
    .test-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    .raw-data-print { background: #f8fafc; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 1rem; line-height: 1.6; border: 1px solid #e2e8f0; word-break: break-all; }
    
    .empty-test-table td { height: 35px; }
    .stats-grid-print { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .print-empty-box { border: 1px solid #cbd5e1; height: 60px; background: white; border-radius: 8px; }
    .print-empty-chart { border: 2px dashed #cbd5e1; height: 250px; border-radius: 12px; margin-top: 10px; }
  }
</style>