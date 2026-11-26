import {
  AlgorithmComparisonEntry,
  BadgeInfo,
  GameProgress,
  TrainedModelResult,
} from '../types/ml';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(text: string | number | null | undefined): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function downloadCsvFile(filename: string, csvContent: string) {
  triggerDownload(filename, '\uFEFF' + csvContent, 'text/csv;charset=utf-8;');
}

export function downloadConfusionMatrixCsv(model: TrainedModelResult) {
  const { classes, matrix } = model.metrics;
  const header = ['Real \\ Predicho', ...classes].join(',');
  const rows = classes.map((cls, r) => [cls, ...matrix[r]].join(','));
  downloadCsvFile(
    `matriz_confusion_${model.algorithm}_${Date.now()}.csv`,
    [header, ...rows].join('\n')
  );
}

export function downloadMetricsCsv(model: TrainedModelResult) {
  const m = model.metrics;
  const lines = ['Nivel,Clase,Soporte,TP,FP,FN,TN,Precision,Recall,Especificidad,F1_Score,FPR,FNR'];
  for (const c of m.perClass) {
    lines.push(
      [
        'Por clase',
        `"${c.className}"`,
        c.support,
        c.tp,
        c.fp,
        c.fn,
        c.tn,
        c.precision.toFixed(4),
        c.recall.toFixed(4),
        c.specificity.toFixed(4),
        c.f1.toFixed(4),
        c.fpr.toFixed(4),
        c.fnr.toFixed(4),
      ].join(',')
    );
  }
  lines.push(
    [
      'Resumen Global',
      'Macro Promedio',
      m.totalSamples,
      '-',
      '-',
      '-',
      '-',
      m.macroPrecision.toFixed(4),
      m.macroRecall.toFixed(4),
      m.macroSpecificity.toFixed(4),
      m.macroF1.toFixed(4),
      m.macroFpr.toFixed(4),
      m.macroFnr.toFixed(4),
    ].join(',')
  );
  lines.push(`Accuracy Global,,${m.totalSamples},,,,,${m.macroAccuracy.toFixed(4)},,,,,`);
  downloadCsvFile(`metricas_${model.algorithm}_${Date.now()}.csv`, lines.join('\n'));
}

export function downloadPredictionsCsv(model: TrainedModelResult) {
  const featureKeys = Object.keys(model.predictions[0]?.featuresSummary ?? {});
  const headers = [
    'Fila_Prueba',
    'Etiqueta_Real',
    'Prediccion_Modelo',
    'Acierto',
    ...(model.isBinary ? ['Resultado_Binario'] : []),
    ...model.classes.map((c) => `Prob_${c}`),
    ...featureKeys,
  ];
  const lines = [headers.join(',')];
  for (const p of model.predictions) {
    const row = [
      p.rowIndex,
      `"${p.actual}"`,
      `"${p.predicted}"`,
      p.correct ? 'Correcto' : 'Error',
      ...(model.isBinary ? [p.binaryOutcome ?? ''] : []),
      ...model.classes.map((c) => (p.probabilities[c] ?? 0).toFixed(4)),
      ...featureKeys.map((k) => `"${p.featuresSummary[k] ?? ''}"`),
    ];
    lines.push(row.join(','));
  }
  downloadCsvFile(`predicciones_${model.algorithm}_${Date.now()}.csv`, lines.join('\n'));
}

export function downloadStandaloneHtmlReport(
  model: TrainedModelResult,
  comparison: AlgorithmComparisonEntry[]
) {
  const m = model.metrics;
  const bin = m.binary;
  const acc = (m.macroAccuracy * 100).toFixed(1);
  const prec = ((bin ? bin.precision : m.macroPrecision) * 100).toFixed(1);
  const rec = ((bin ? bin.recall : m.macroRecall) * 100).toFixed(1);
  const spec = ((bin ? bin.specificity : m.macroSpecificity) * 100).toFixed(1);
  const f1 = ((bin ? bin.f1 : m.macroF1) * 100).toFixed(1);
  const fpr = ((bin ? bin.fpr : m.macroFpr) * 100).toFixed(1);
  const fnr = ((bin ? bin.fnr : m.macroFnr) * 100).toFixed(1);

  const maxMatrixVal = Math.max(1, ...m.matrix.flat());

  // Build SVG bar chart for Class Distribution
  const distSvgWidth = 540;
  const distSvgHeight = 220;
  const distBarGroupW = Math.floor((distSvgWidth - 80) / Math.max(1, m.classes.length));
  const maxDistCount = Math.max(
    1,
    ...m.classes.map((c) => {
      const actualC = m.perClass.find((p) => p.className === c)?.support ?? 0;
      const predC = model.predictions.filter((p) => p.predicted === c).length;
      return Math.max(actualC, predC);
    })
  );

  const distBarsSvg = m.classes
    .map((cls, i) => {
      const actualC = m.perClass.find((p) => p.className === cls)?.support ?? 0;
      const predC = model.predictions.filter((p) => p.predicted === cls).length;
      const xBase = 55 + i * distBarGroupW;
      const barW = Math.min(34, Math.floor(distBarGroupW * 0.34));
      const hAct = Math.round((actualC / maxDistCount) * 140);
      const hPred = Math.round((predC / maxDistCount) * 140);
      return `
        <rect x="${xBase}" y="${170 - hAct}" width="${barW}" height="${hAct}" rx="4" fill="#0F172A" />
        <text x="${xBase + barW / 2}" y="${164 - hAct}" text-anchor="middle" font-size="11" fill="#0F172A" font-weight="600">${actualC}</text>
        <rect x="${xBase + barW + 6}" y="${170 - hPred}" width="${barW}" height="${hPred}" rx="4" fill="#0284C7" />
        <text x="${xBase + barW + 6 + barW / 2}" y="${164 - hPred}" text-anchor="middle" font-size="11" fill="#0284C7" font-weight="600">${predC}</text>
        <text x="${xBase + barW + 3}" y="192" text-anchor="middle" font-size="11" fill="#475569">${escapeHtml(cls.slice(0, 14))}</text>
      `;
    })
    .join('');

  // Build SVG bar chart for algorithm comparison if available
  const compSection =
    comparison.length > 0
      ? `
    <section class="card">
      <h2>Comparación entre Algoritmos</h2>
      <p class="subtitle">Todos los algoritmos evaluados sobre la misma partición estratificada de prueba (${m.totalSamples} registros).</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Algoritmo</th>
              <th class="num">Accuracy</th>
              <th class="num">Precision</th>
              <th class="num">Recall</th>
              <th class="num">Especificidad</th>
              <th class="num">F1-Score</th>
              <th class="num">FPR</th>
              <th class="num">FNR</th>
            </tr>
          </thead>
          <tbody>
            ${comparison
              .map(
                (row) => `
              <tr>
                <td><strong>${escapeHtml(row.algorithmName)}</strong></td>
                <td class="num">${(row.accuracy * 100).toFixed(1)}%</td>
                <td class="num">${(row.precision * 100).toFixed(1)}%</td>
                <td class="num">${(row.recall * 100).toFixed(1)}%</td>
                <td class="num">${(row.specificity * 100).toFixed(1)}%</td>
                <td class="num"><strong>${(row.f1 * 100).toFixed(1)}%</strong></td>
                <td class="num">${(row.fpr * 100).toFixed(1)}%</td>
                <td class="num">${(row.fnr * 100).toFixed(1)}%</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>`
      : '';

  const matrixTableHtml = `
    <table class="matrix-table">
      <thead>
        <tr>
          <th>Real \\ Predicho</th>
          ${m.classes.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${m.classes
          .map(
            (rowCls, r) => `
          <tr>
            <th>${escapeHtml(rowCls)}</th>
            ${m.classes
              .map((_, c) => {
                const val = m.matrix[r][c];
                const isDiag = r === c;
                const intensity = (val / maxMatrixVal) * 0.35 + 0.08;
                const bg = isDiag
                  ? `rgba(5, 150, 105, ${intensity.toFixed(2)})`
                  : val > 0
                  ? `rgba(220, 38, 38, ${intensity.toFixed(2)})`
                  : '#F8FAFC';
                const tag =
                  model.isBinary
                    ? rowCls === model.positiveClass && m.classes[c] === model.positiveClass
                      ? 'TP'
                      : rowCls !== model.positiveClass && m.classes[c] !== model.positiveClass
                      ? 'TN'
                      : rowCls !== model.positiveClass && m.classes[c] === model.positiveClass
                      ? 'FP'
                      : 'FN'
                    : isDiag
                    ? 'Acierto'
                    : 'Error';
                return `<td style="background:${bg}">
                  <div class="m-val">${val}</div>
                  <div class="m-tag">${tag}</div>
                </td>`;
              })
              .join('')}
          </tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte Interactivo – ${escapeHtml(model.datasetName)}</title>
  <style>
    :root { --bg:#F8FAFC; --card:#FFFFFF; --ink:#0F172A; --muted:#475569; --border:#E2E8F0; --accent:#0284C7; --ok:#059669; --err:#DC2626; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--ink); line-height:1.55; }
    .container { max-width: 1120px; margin: 0 auto; padding: 32px 20px 64px; }
    header { background:#0F172A; color:#F8FAFC; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
    header h1 { margin:0 0 8px; font-size: 26px; }
    .meta { color:#CBD5E1; font-size: 14px; }
    .kpi-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .kpi { background:var(--card); border:1px solid var(--border); border-radius: 12px; padding: 16px; }
    .kpi .label { font-size: 12px; color:var(--muted); margin-bottom: 4px; }
    .kpi .value { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    @media (max-width: 820px) { .grid-2 { grid-template-columns: 1fr; } }
    .card { background:var(--card); border:1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 24px; }
    h2 { margin: 0 0 8px; font-size: 19px; }
    .subtitle { margin: 0 0 18px; color: var(--muted); font-size: 14px; }
    .matrix-table { width: 100%; border-collapse: collapse; text-align:center; }
    .matrix-table th, .matrix-table td { border: 1px solid var(--border); padding: 14px 10px; }
    .matrix-table th { background:#F1F5F9; font-size: 13px; }
    .m-val { font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .m-tag { font-size: 11px; color: var(--muted); margin-top: 2px; }
    .table-wrap { overflow-x: auto; }
    table { width:100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom:1px solid var(--border); padding: 10px 12px; text-align:left; }
    th { background:#F8FAFC; color: var(--muted); font-weight: 600; }
    .num { text-align:right; font-variant-numeric: tabular-nums; }
    .formula { font-family: ui-monospace, monospace; background:#F1F5F9; padding: 3px 8px; border-radius: 6px; font-size: 12px; }
    .conclusions li { margin-bottom: 10px; }
    .filter-bar { display:flex; gap:8px; margin-bottom: 14px; flex-wrap:wrap; }
    .btn { border:1px solid var(--border); background:#fff; padding:7px 14px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; }
    .btn.active { background:#0F172A; color:#fff; border-color:#0F172A; }
    .ok-text { color: var(--ok); font-weight:600; }
    .err-text { color: var(--err); font-weight:600; }
    footer { text-align:center; color:var(--muted); font-size:12px; margin-top:32px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Reporte de Clasificación y Matriz de Confusión</h1>
      <div class="meta">
        Conjunto de datos: <strong>${escapeHtml(model.datasetName)}</strong> · Sector: ${escapeHtml(model.sector)} · Algoritmo: <strong>${escapeHtml(model.algorithmName)}</strong> · Variable objetivo: ${escapeHtml(model.targetColumn)} · Generado: ${new Date().toLocaleString('es-ES')}
      </div>
    </header>

    <div class="kpi-grid">
      <div class="kpi"><div class="label">Accuracy (Exactitud)</div><div class="value">${acc}%</div></div>
      <div class="kpi"><div class="label">Precision</div><div class="value">${prec}%</div></div>
      <div class="kpi"><div class="label">Recall (Sensibilidad)</div><div class="value">${rec}%</div></div>
      <div class="kpi"><div class="label">Especificidad</div><div class="value">${spec}%</div></div>
      <div class="kpi"><div class="label">F1-Score</div><div class="value">${f1}%</div></div>
      <div class="kpi"><div class="label">Tasa Falsos Positivos</div><div class="value">${fpr}%</div></div>
      <div class="kpi"><div class="label">Tasa Falsos Negativos</div><div class="value">${fnr}%</div></div>
    </div>

    <div class="grid-2">
      <section class="card" style="margin-bottom:0">
        <h2>Matriz de Confusión</h2>
        <p class="subtitle">${model.isBinary ? `Clase positiva analizada: ${escapeHtml(model.positiveClass)} (Umbral: ${model.threshold.toFixed(2)})` : `Clasificación multiclase (${m.classes.length} clases)`} · Prueba: ${m.totalSamples} registros</p>
        ${matrixTableHtml}
      </section>

      <section class="card" style="margin-bottom:0">
        <h2>Distribución Real vs. Predicha</h2>
        <p class="subtitle">Comparación de frecuencia real (oscuro) frente a predicha (azul) en el conjunto de prueba.</p>
        <svg viewBox="0 0 ${distSvgWidth} ${distSvgHeight}" width="100%" height="auto" aria-label="Distribución de clases">
          <line x1="40" y1="170" x2="${distSvgWidth - 20}" y2="170" stroke="#CBD5E1" stroke-width="1" />
          ${distBarsSvg}
        </svg>
      </section>
    </div>

    <section class="card">
      <h2>Conclusiones Automáticas del Desempeño</h2>
      <ul class="conclusions">
        ${model.conclusions.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}
      </ul>
    </section>

    <section class="card">
      <h2>Guía de Métricas y Fórmulas Aplicadas</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Fórmula</th>
              <th class="num">Valor</th>
              <th>Significado práctico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Accuracy</strong></td>
              <td><span class="formula">(TP + TN) / Total</span></td>
              <td class="num">${acc}%</td>
              <td>Porcentaje total de predicciones correctas sobre los ${m.totalSamples} casos evaluados.</td>
            </tr>
            <tr>
              <td><strong>Precision</strong></td>
              <td><span class="formula">TP / (TP + FP)</span></td>
              <td class="num">${prec}%</td>
              <td>De las veces que el modelo predijo la clase positiva, cuántas veces acertó realmente.</td>
            </tr>
            <tr>
              <td><strong>Recall (Sensibilidad)</strong></td>
              <td><span class="formula">TP / (TP + FN)</span></td>
              <td class="num">${rec}%</td>
              <td>Proporción de casos positivos reales que el modelo logró detectar sin dejarlos escapar.</td>
            </tr>
            <tr>
              <td><strong>Especificidad</strong></td>
              <td><span class="formula">TN / (TN + FP)</span></td>
              <td class="num">${spec}%</td>
              <td>Capacidad del modelo para identificar correctamente los casos negativos sin generar falsas alarmas.</td>
            </tr>
            <tr>
              <td><strong>F1-Score</strong></td>
              <td><span class="formula">2 · (P · R) / (P + R)</span></td>
              <td class="num">${f1}%</td>
              <td>Media armónica entre Precision y Recall; útil cuando las clases están desbalanceadas.</td>
            </tr>
            <tr>
              <td><strong>Tasa de Falsos Positivos (FPR)</strong></td>
              <td><span class="formula">FP / (FP + TN)</span></td>
              <td class="num">${fpr}%</td>
              <td>Proporción de casos negativos reales clasificados erróneamente como positivos.</td>
            </tr>
            <tr>
              <td><strong>Tasa de Falsos Negativos (FNR)</strong></td>
              <td><span class="formula">FN / (FN + TP)</span></td>
              <td class="num">${fnr}%</td>
              <td>Proporción de casos positivos reales que pasaron desapercibidos para el modelo.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    ${compSection}

    <section class="card">
      <h2>Explorador de Predicciones de Prueba (${model.predictions.length} registros)</h2>
      <div class="filter-bar">
        <button class="btn active" onclick="filterRows('all', this)">Todos (${model.predictions.length})</button>
        <button class="btn" onclick="filterRows('ok', this)">Aciertos (${m.totalCorrect})</button>
        <button class="btn" onclick="filterRows('err', this)">Errores (${m.totalErrors})</button>
      </div>
      <div class="table-wrap">
        <table id="predTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Etiqueta Real</th>
              <th>Predicción</th>
              <th>Estado</th>
              ${model.isBinary ? '<th>Tipo</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${model.predictions
              .slice(0, 120)
              .map(
                (p) => `
              <tr data-status="${p.correct ? 'ok' : 'err'}">
                <td class="num">${p.rowIndex}</td>
                <td>${escapeHtml(p.actual)}</td>
                <td>${escapeHtml(p.predicted)}</td>
                <td class="${p.correct ? 'ok-text' : 'err-text'}">${p.correct ? 'Acierto' : 'Error'}</td>
                ${model.isBinary ? `<td>${p.binaryOutcome ?? ''}</td>` : ''}
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>

    <footer>
      Reporte autónomo generado por CONFUSION MATRIX QUEST – Funciona sin conexión en cualquier navegador.
    </footer>
  </div>

  <script>
    function filterRows(mode, btn) {
      document.querySelectorAll('.filter-bar .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('#predTable tbody tr').forEach(tr => {
        const s = tr.getAttribute('data-status');
        tr.style.display = (mode === 'all' || s === mode) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  triggerDownload(
    `reporte_matriz_confusion_${model.algorithm}_${Date.now()}.html`,
    html,
    'text/html;charset=utf-8;'
  );
}

export function downloadCertificateHtml(
  progress: GameProgress,
  badges: BadgeInfo[]
) {
  const player = escapeHtml(progress.playerName || 'Estudiante de Analítica');
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificado Simbólico – Confusion Matrix Quest</title>
  <style>
    body { margin:0; padding:40px 20px; background:#F1F5F9; font-family: system-ui, -apple-system, sans-serif; color:#0F172A; display:flex; justify-content:center; }
    .cert { max-width: 820px; width:100%; background:#FFFFFF; border: 2px solid #0F172A; padding: 48px; border-radius: 16px; text-align:center; }
    .kicker { font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color:#0284C7; font-weight:700; margin-bottom: 12px; }
    h1 { font-size: 34px; margin: 0 0 12px; }
    .name { font-size: 30px; font-weight:700; color:#0F172A; border-bottom: 2px solid #E2E8F0; display:inline-block; padding: 6px 32px; margin: 18px 0; }
    p { color:#475569; font-size:16px; max-width: 600px; margin: 0 auto 24px; }
    .badges { display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin: 24px 0; }
    .badge { border:1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px; font-size: 13px; background:#F8FAFC; }
    .footer { display:flex; justify-content:space-between; margin-top:36px; padding-top:20px; border-top:1px solid #E2E8F0; font-size:13px; color:#475569; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="kicker">Certificado Simbólico de Aprendizaje</div>
    <h1>CONFUSION MATRIX QUEST</h1>
    <p>Se otorga el presente reconocimiento a</p>
    <div class="name">${player}</div>
    <p>por haber completado exitosamente los 5 niveles del reto educativo en clasificación supervisada, construcción de matrices de confusión, análisis de impacto por sector e interpretación de métricas estadísticas.</p>
    <div class="badges">
      ${badges.map((b) => `<div class="badge"><strong>Nivel ${b.level}:</strong> ${escapeHtml(b.title)}</div>`).join('')}
    </div>
    <div class="footer">
      <span>Puntuación final: <strong>${progress.xp} XP</strong></span>
      <span>Fecha de emisión: ${dateStr}</span>
    </div>
  </div>
</body>
</html>`;

  triggerDownload(
    `certificado_confusion_matrix_quest.html`,
    html,
    'text/html;charset=utf-8;'
  );
}
