import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Download,
  FileCode2,
  FileSpreadsheet,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import {
  AlgorithmComparisonEntry,
  TrainedModelResult,
} from '../types/ml';
import {
  downloadConfusionMatrixCsv,
  downloadMetricsCsv,
  downloadPredictionsCsv,
  downloadStandaloneHtmlReport,
} from '../utils/htmlExporter';

interface DashboardModuleProps {
  model: TrainedModelResult;
  comparison: AlgorithmComparisonEntry[];
  onRunComparison: () => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  model,
  comparison,
  onRunComparison,
}) => {
  const [predFilter, setPredFilter] = useState<'all' | 'correct' | 'error'>('all');
  const { metrics } = model;
  const bin = metrics.binary;

  const summaryKpis = [
    { label: 'Accuracy', value: metrics.macroAccuracy },
    { label: 'Precision', value: bin ? bin.precision : metrics.macroPrecision },
    { label: 'Recall', value: bin ? bin.recall : metrics.macroRecall },
    { label: 'Especificidad', value: bin ? bin.specificity : metrics.macroSpecificity },
    { label: 'F1-Score', value: bin ? bin.f1 : metrics.macroF1 },
    { label: 'FPR', value: bin ? bin.fpr : metrics.macroFpr },
    { label: 'FNR', value: bin ? bin.fnr : metrics.macroFnr },
  ];

  // Distribution data (Actual vs Predicted per class)
  const classDistData = useMemo(() => {
    return metrics.classes.map((cls) => {
      const actualCount =
        metrics.perClass.find((p) => p.className === cls)?.support ?? 0;
      const predCount = model.predictions.filter((p) => p.predicted === cls).length;
      const errorsForClass = model.predictions.filter(
        (p) => p.actual === cls && !p.correct
      ).length;
      return {
        cls,
        actualCount,
        predCount,
        correctCount: actualCount - errorsForClass,
        errorsForClass,
      };
    });
  }, [metrics.classes, metrics.perClass, model.predictions]);

  const maxDistVal = Math.max(
    1,
    ...classDistData.map((d) => Math.max(d.actualCount, d.predCount))
  );

  const filteredPredictions = useMemo(() => {
    if (predFilter === 'correct') return model.predictions.filter((p) => p.correct);
    if (predFilter === 'error') return model.predictions.filter((p) => !p.correct);
    return model.predictions;
  }, [model.predictions, predFilter]);

  const bestF1Algo = useMemo(() => {
    if (comparison.length === 0) return null;
    return [...comparison].sort((a, b) => b.f1 - a.f1)[0];
  }, [comparison]);

  return (
    <div className="space-y-8">
      {/* Export Hub Header */}
      <section className="bg-[#0F172A] text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Dashboard de resultados y exportación
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {model.datasetName} · {model.algorithmName} · {metrics.totalSamples} registros de prueba evaluados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => downloadStandaloneHtmlReport(model, comparison)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0284C7] hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileCode2 className="w-4 h-4" />
            Descargar Reporte HTML
          </button>
          <button
            type="button"
            onClick={() => downloadConfusionMatrixCsv(model)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Matriz (.csv)
          </button>
          <button
            type="button"
            onClick={() => downloadMetricsCsv(model)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Métricas (.csv)
          </button>
          <button
            type="button"
            onClick={() => downloadPredictionsCsv(model)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Predicciones (.csv)
          </button>
        </div>
      </section>

      {/* 7 Metrics Executive KPI Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
        {summaryKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-slate-200 rounded-xl p-4"
          >
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900">
              {(kpi.value * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </section>

      {/* Matrix Snapshot + Class Distribution & Errors Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Compact Matrix */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900">
            Matriz de confusión
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Filas = Etiqueta real · Columnas = Predicción
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500">
                    Real \ Pred.
                  </th>
                  {metrics.classes.map((c) => (
                    <th
                      key={c}
                      className="p-2 border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.classes.map((rCls, r) => (
                  <tr key={rCls}>
                    <th className="p-2 border border-slate-200 bg-slate-50 font-semibold text-slate-800 text-left">
                      {rCls}
                    </th>
                    {metrics.classes.map((_, c) => {
                      const val = metrics.matrix[r][c];
                      const isDiag = r === c;
                      return (
                        <td
                          key={c}
                          className={`p-3 border border-slate-200 font-mono tabular-nums text-base font-bold ${
                            isDiag
                              ? 'bg-emerald-50 text-emerald-900'
                              : val > 0
                              ? 'bg-red-50 text-red-900'
                              : 'bg-white text-slate-400'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              Resumen de errores por clase real
            </h4>
            <div className="space-y-2">
              {classDistData.map((d) => {
                const okPct =
                  d.actualCount > 0 ? (d.correctCount / d.actualCount) * 100 : 0;
                return (
                  <div key={d.cls} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-700 tabular-nums">
                      <span>{d.cls}</span>
                      <span>
                        {d.correctCount} aciertos · {d.errorsForClass} errores
                      </span>
                    </div>
                    <div className="h-2 w-full bg-red-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#059669]"
                        style={{ width: `${okPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Class Distribution SVG Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Distribución real vs. predicha en prueba
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Permite detectar si el modelo sesga sus predicciones hacia una clase mayoritaria.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#0F172A] inline-block" />
                  Real
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#0284C7] inline-block" />
                  Predicho
                </span>
              </div>
            </div>

            <div className="mt-4">
              <svg
                viewBox="0 0 560 220"
                className="w-full h-auto"
                role="img"
                aria-label="Gráfico comparativo de distribución real vs predicha"
              >
                <line
                  x1="40"
                  y1="175"
                  x2="540"
                  y2="175"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                {classDistData.map((d, idx) => {
                  const groupW = 480 / Math.max(1, classDistData.length);
                  const x0 = 55 + idx * groupW;
                  const barW = Math.min(38, groupW * 0.34);
                  const hAct = Math.round((d.actualCount / maxDistVal) * 140);
                  const hPred = Math.round((d.predCount / maxDistVal) * 140);
                  return (
                    <g key={d.cls}>
                      <rect
                        x={x0}
                        y={175 - hAct}
                        width={barW}
                        height={hAct}
                        rx="4"
                        fill="#0F172A"
                      />
                      <text
                        x={x0 + barW / 2}
                        y={169 - hAct}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#0F172A"
                      >
                        {d.actualCount}
                      </text>
                      <rect
                        x={x0 + barW + 8}
                        y={175 - hPred}
                        width={barW}
                        height={hPred}
                        rx="4"
                        fill="#0284C7"
                      />
                      <text
                        x={x0 + barW + 8 + barW / 2}
                        y={169 - hPred}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="600"
                        fill="#0284C7"
                      >
                        {d.predCount}
                      </text>
                      <text
                        x={x0 + barW + 4}
                        y="196"
                        textAnchor="middle"
                        fontSize="11"
                        fill="#475569"
                      >
                        {d.cls.length > 15 ? d.cls.slice(0, 14) + '…' : d.cls}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Automatic Conclusions */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-900 mb-2">
              Conclusiones automáticas del modelo
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed">
              {model.conclusions.map((c, idx) => (
                <li key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Algorithm Comparison Section */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Comparación entre algoritmos
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Evalúa los 5 clasificadores sobre exactamente la misma partición estratificada ({metrics.totalSamples} casos de prueba).
            </p>
          </div>
          <button
            type="button"
            onClick={onRunComparison}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {comparison.length > 0 ? 'Recalcular comparativa' : 'Comparar 5 algoritmos'}
          </button>
        </div>

        {comparison.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5">
              <svg
                viewBox="0 0 460 220"
                className="w-full h-auto"
                role="img"
                aria-label="Comparativa F1 y Accuracy entre algoritmos"
              >
                <line
                  x1="36"
                  y1="175"
                  x2="445"
                  y2="175"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                {comparison.map((entry, idx) => {
                  const gw = 400 / comparison.length;
                  const x = 44 + idx * gw;
                  const bw = 22;
                  const hAcc = Math.round(entry.accuracy * 140);
                  const hF1 = Math.round(entry.f1 * 140);
                  return (
                    <g key={entry.algorithm}>
                      <rect
                        x={x}
                        y={175 - hAcc}
                        width={bw}
                        height={hAcc}
                        rx="3"
                        fill="#0F172A"
                      />
                      <rect
                        x={x + bw + 4}
                        y={175 - hF1}
                        width={bw}
                        height={hF1}
                        rx="3"
                        fill="#0284C7"
                      />
                      <text
                        x={x + bw + 2}
                        y="194"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#475569"
                      >
                        {entry.algorithmName.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div className="flex items-center justify-center gap-5 text-xs text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#0F172A] inline-block" />
                  Accuracy
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#0284C7] inline-block" />
                  F1-Score
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">Algoritmo</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Accuracy</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Precision</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Recall</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Especif.</th>
                    <th className="py-2.5 px-3 font-semibold text-right">F1-Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparison.map((row) => {
                    const isBest = bestF1Algo?.algorithm === row.algorithm;
                    return (
                      <tr
                        key={row.algorithm}
                        className={isBest ? 'bg-sky-50/50' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {row.algorithmName}
                          {isBest && (
                            <span className="ml-2 text-[#0284C7] text-[11px]">
                              (Mejor F1)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {(row.accuracy * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {(row.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {(row.recall * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {(row.specificity * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {(row.f1 * 100).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-6 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
            Haz clic en <strong>Comparar 5 algoritmos</strong> para entrenar Regresión Logística, Árbol de Decisión, Random Forest, KNN y Naive Bayes sobre este mismo conjunto de datos.
          </div>
        )}
      </section>

      {/* Predictions Table Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Predicciones individuales de prueba
            </h3>
            <p className="text-xs text-slate-500">
              Consulta qué predijo el modelo en cada fila y dónde cometió errores.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setPredFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                predFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({model.predictions.length})
            </button>
            <button
              type="button"
              onClick={() => setPredFilter('correct')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                predFilter === 'correct'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aciertos ({metrics.totalCorrect})
            </button>
            <button
              type="button"
              onClick={() => setPredFilter('error')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                predFilter === 'error'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Errores ({metrics.totalErrors})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[380px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Etiqueta Real</th>
                <th className="py-2.5 px-3 font-semibold">Predicción</th>
                <th className="py-2.5 px-3 font-semibold">Resultado</th>
                {model.isBinary && (
                  <th className="py-2.5 px-3 font-semibold">Casilla</th>
                )}
                <th className="py-2.5 px-3 font-semibold">Confianza predicha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPredictions.slice(0, 80).map((p) => (
                <tr key={p.rowIndex} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                    {p.rowIndex}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {p.actual}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {p.predicted}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        p.correct ? 'text-[#059669]' : 'text-[#DC2626]'
                      }`}
                    >
                      {p.correct ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {p.correct ? 'Acierto' : 'Error'}
                    </span>
                  </td>
                  {model.isBinary && (
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">
                      {p.binaryOutcome}
                    </td>
                  )}
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600">
                    {((p.probabilities[p.predicted] ?? 0) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
