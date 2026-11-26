import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { PredictionRow, TrainedModelResult } from '../types/ml';

interface ConfusionMatrixLabProps {
  model: TrainedModelResult;
  onChangeThreshold: (threshold: number) => void;
  onChangePositiveClass: (cls: string) => void;
  onGoToGame: () => void;
}

type MetricKey =
  | 'accuracy'
  | 'precision'
  | 'recall'
  | 'specificity'
  | 'f1'
  | 'fpr'
  | 'fnr';

export const ConfusionMatrixLab: React.FC<ConfusionMatrixLabProps> = ({
  model,
  onChangeThreshold,
  onChangePositiveClass,
  onGoToGame,
}) => {
  const { metrics } = model;
  const [selectedCell, setSelectedCell] = useState<{
    actual: string;
    predicted: string;
  } | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('precision');

  const maxMatrixCount = useMemo(
    () => Math.max(1, ...metrics.matrix.flat()),
    [metrics.matrix]
  );

  // Filter predictions matching clicked cell (or default to errors if none clicked)
  const inspectedRows: PredictionRow[] = useMemo(() => {
    if (!selectedCell) {
      return model.predictions.slice(0, 8);
    }
    return model.predictions.filter(
      (p) =>
        p.actual === selectedCell.actual &&
        p.predicted === selectedCell.predicted
    );
  }, [model.predictions, selectedCell]);

  const binaryStats = metrics.binary;
  const posLabel = metrics.positiveClass;
  const negLabel = metrics.negativeClass ?? 'Otra clase';

  // Values used in metric cards (binary exact or macro average for multiclass)
  const metricValues: Record<MetricKey, number> = {
    accuracy: metrics.macroAccuracy,
    precision: binaryStats ? binaryStats.precision : metrics.macroPrecision,
    recall: binaryStats ? binaryStats.recall : metrics.macroRecall,
    specificity: binaryStats ? binaryStats.specificity : metrics.macroSpecificity,
    f1: binaryStats ? binaryStats.f1 : metrics.macroF1,
    fpr: binaryStats ? binaryStats.fpr : metrics.macroFpr,
    fnr: binaryStats ? binaryStats.fnr : metrics.macroFnr,
  };

  const metricDetails = useMemo(() => {
    const tp = binaryStats?.tp ?? metrics.perClass[0]?.tp ?? 0;
    const tn = binaryStats?.tn ?? metrics.perClass[0]?.tn ?? 0;
    const fp = binaryStats?.fp ?? metrics.perClass[0]?.fp ?? 0;
    const fn = binaryStats?.fn ?? metrics.perClass[0]?.fn ?? 0;
    const total = metrics.totalSamples;
    const focusClass = model.isBinary ? posLabel : metrics.perClass[0]?.className ?? posLabel;

    return [
      {
        key: 'accuracy' as MetricKey,
        name: 'Accuracy (Exactitud)',
        formula: '(TP + TN) / (TP + TN + FP + FN)',
        simple:
          'Mide qué porcentaje de todas las predicciones del modelo fueron correctas, sin importar la clase.',
        interpretation:
          metricValues.accuracy >= 0.85
            ? 'Exactitud alta. Aun así, verifica Precision y Recall si las clases están desbalanceadas.'
            : metricValues.accuracy >= 0.7
            ? 'Exactitud moderada. Conviene inspeccionar qué tipo de error domina en la matriz.'
            : 'Exactitud baja. El modelo comete errores frecuentes; prueba ajustar variables o cambiar de algoritmo.',
        appliedExample: `En "${model.datasetName}", el modelo acertó ${metrics.totalCorrect} de ${total} registros de prueba (${(metricValues.accuracy * 100).toFixed(1)}%) para predecir "${model.targetColumn}".`,
      },
      {
        key: 'precision' as MetricKey,
        name: 'Precision (Precisión)',
        formula: 'TP / (TP + FP)',
        simple:
          'De todos los casos que el modelo marcó como positivos, ¿qué proporción lo era realmente?',
        interpretation:
          metricValues.precision >= 0.8
            ? 'Pocas falsas alarmas: cuando el modelo predice la clase positiva, suele tener razón.'
            : 'Hay falsos positivos relevantes: el modelo genera alertas que luego resultan ser falsas.',
        appliedExample: model.isBinary
          ? `Cuando el modelo predijo "${focusClass}", lo hizo ${tp + fp} veces y acertó en ${tp} (${(metricValues.precision * 100).toFixed(1)}%). Los otros ${fp} casos eran "${negLabel}".`
          : `En promedio macro entre las ${metrics.classes.length} clases de "${model.targetColumn}", la precisión alcanza ${(metricValues.precision * 100).toFixed(1)}%.`,
      },
      {
        key: 'recall' as MetricKey,
        name: 'Recall o Sensibilidad',
        formula: 'TP / (TP + FN)',
        simple:
          'De todos los casos que eran positivos en la realidad, ¿cuántos logró detectar el modelo?',
        interpretation:
          metricValues.recall >= 0.8
            ? 'Buena cobertura: el modelo deja escapar pocos casos positivos reales.'
            : 'Cobertura limitada: se están escapando casos positivos reales como Falsos Negativos.',
        appliedExample: model.isBinary
          ? `Había ${tp + fn} casos reales de "${focusClass}" en prueba y el modelo capturó ${tp} (${(metricValues.recall * 100).toFixed(1)}%), dejando escapar ${fn} como Falsos Negativos.`
          : `En promedio entre todas las clases de "${model.targetColumn}", el modelo detecta el ${(metricValues.recall * 100).toFixed(1)}% de los casos reales de cada categoría.`,
      },
      {
        key: 'specificity' as MetricKey,
        name: 'Especificidad',
        formula: 'TN / (TN + FP)',
        simple:
          'Mide qué tan bien identifica el modelo los casos negativos reales sin confundirlos con positivos.',
        interpretation:
          metricValues.specificity >= 0.85
            ? 'Alta capacidad para descartar casos negativos correctamente.'
            : 'Especificidad moderada o baja: el modelo confunde varios negativos con positivos.',
        appliedExample: model.isBinary
          ? `De ${tn + fp} registros reales de "${negLabel}", clasificó correctamente ${tn} (${(metricValues.specificity * 100).toFixed(1)}%) y generó ${fp} falsas alarmas.`
          : `La especificidad promedio One-vs-Rest frente al resto de clases es de ${(metricValues.specificity * 100).toFixed(1)}%.`,
      },
      {
        key: 'f1' as MetricKey,
        name: 'F1-Score',
        formula: '2 · (Precision · Recall) / (Precision + Recall)',
        simple:
          'Combina Precision y Recall en un único equilibrio (media armónica). Solo es alto si ambos son buenos.',
        interpretation:
          metricValues.f1 >= 0.8
            ? 'Equilibrio sólido entre evitar falsas alarmas y no dejar escapar positivos.'
            : 'Existe un desequilibrio entre Precision y Recall o un desempeño moderado en la clase positiva.',
        appliedExample: `Para "${model.datasetName}", el F1-Score es ${(metricValues.f1 * 100).toFixed(1)}%, sintetizando Precision (${(metricValues.precision * 100).toFixed(1)}%) y Recall (${(metricValues.recall * 100).toFixed(1)}%).`,
      },
      {
        key: 'fpr' as MetricKey,
        name: 'Tasa de Falsos Positivos (FPR)',
        formula: 'FP / (FP + TN)',
        simple:
          'Porcentaje de casos negativos reales que fueron acusados erróneamente como positivos (falsa alarma).',
        interpretation:
          metricValues.fpr <= 0.15
            ? 'Tasa de falsa alarma controlada.'
            : 'Tasa de falsa alarma elevada; conviene revisar el umbral o las variables predictoras.',
        appliedExample: model.isBinary
          ? `De ${fp + tn} casos reales de "${negLabel}", el ${(metricValues.fpr * 100).toFixed(1)}% (${fp} casos) recibió una predicción errónea de "${focusClass}".`
          : `La tasa promedio de falsas alarmas por clase es ${(metricValues.fpr * 100).toFixed(1)}%.`,
      },
      {
        key: 'fnr' as MetricKey,
        name: 'Tasa de Falsos Negativos (FNR)',
        formula: 'FN / (FN + TP)',
        simple:
          'Porcentaje de casos positivos reales que el modelo no detectó (omisión). Es el complemento del Recall (1 - Recall).',
        interpretation:
          metricValues.fnr <= 0.15
            ? 'Baja omisión de casos positivos.'
            : 'Atención: se omite una proporción importante de casos positivos reales.',
        appliedExample: model.isBinary
          ? `De ${fn + tp} casos reales de "${focusClass}", el modelo pasó por alto ${fn} registros (${(metricValues.fnr * 100).toFixed(1)}%).`
          : `La tasa promedio de omisión por clase en "${model.targetColumn}" es ${(metricValues.fnr * 100).toFixed(1)}%.`,
      },
    ];
  }, [binaryStats, metricValues, metrics, model.datasetName, model.isBinary, model.targetColumn, negLabel, posLabel]);

  const currentMetricDetail =
    metricDetails.find((m) => m.key === activeMetric) ?? metricDetails[0];

  const getCellTag = (actualCls: string, predCls: string) => {
    if (!model.isBinary) {
      return actualCls === predCls ? 'Acierto' : 'Confusión';
    }
    if (actualCls === posLabel && predCls === posLabel) return 'TP · Verdadero Positivo';
    if (actualCls !== posLabel && predCls !== posLabel) return 'TN · Verdadero Negativo';
    if (actualCls !== posLabel && predCls === posLabel) return 'FP · Falso Positivo';
    return 'FN · Falso Negativo';
  };

  return (
    <div className="space-y-8">
      {/* Top Interactive Matrix + Controls Stage */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Matrix Interactive Canvas */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                  Laboratorio interactivo de Matriz de Confusión
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {model.algorithmName} · {model.datasetName} · Haz clic en cualquier celda para inspeccionar registros reales de prueba.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                Prueba: {metrics.totalSamples} casos
              </span>
            </div>

            {/* Interactive Controls for Binary Models */}
            {model.isBinary && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1.5 tabular-nums">
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#0284C7]" />
                      Umbral de decisión
                    </span>
                    <span className="font-mono">{model.threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.9}
                    step={0.05}
                    value={model.threshold}
                    onChange={(e) => onChangeThreshold(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    aria-label="Umbral de clasificación"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Bajar el umbral reduce FN (sube Recall); subirlo reduce FP (sube Precision).
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="lab-pos-class"
                    className="block text-xs font-semibold text-slate-800 mb-1.5"
                  >
                    Clase Positiva de referencia
                  </label>
                  <select
                    id="lab-pos-class"
                    value={model.positiveClass}
                    onChange={(e) => onChangePositiveClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900"
                  >
                    {model.classes.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Matrix Grid */}
            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[420px]">
                <div className="text-center text-xs font-semibold text-slate-500 mb-2">
                  Predicción del modelo (Columnas)
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-xs font-semibold text-slate-500 w-36">
                        Real (Filas) \ Pred.
                      </th>
                      {metrics.classes.map((predCls) => (
                        <th
                          key={predCls}
                          className="p-2.5 text-center text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200"
                        >
                          {predCls}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.classes.map((actualCls, rIdx) => (
                      <tr key={actualCls}>
                        <th className="p-2.5 text-left text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200">
                          {actualCls}
                        </th>
                        {metrics.classes.map((predCls, cIdx) => {
                          const count = metrics.matrix[rIdx][cIdx];
                          const pct = ((count / Math.max(1, metrics.totalSamples)) * 100).toFixed(1);
                          const isDiag = rIdx === cIdx;
                          const isSelected =
                            selectedCell?.actual === actualCls &&
                            selectedCell?.predicted === predCls;
                          const ratio = count / maxMatrixCount;

                          let bgClass = 'bg-white';
                          let textAccent = 'text-slate-900';
                          let tagText = getCellTag(actualCls, predCls);

                          if (isDiag) {
                            bgClass =
                              ratio > 0.55
                                ? 'bg-emerald-100/90'
                                : 'bg-emerald-50/90';
                            textAccent = 'text-emerald-900';
                          } else if (count > 0) {
                            bgClass =
                              model.isBinary && predCls === posLabel
                                ? 'bg-amber-50'
                                : 'bg-red-50';
                            textAccent =
                              model.isBinary && predCls === posLabel
                                ? 'text-amber-900'
                                : 'text-red-900';
                          }

                          return (
                            <td key={predCls} className="p-0 border border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCell({
                                    actual: actualCls,
                                    predicted: predCls,
                                  })
                                }
                                className={`w-full h-full p-4 text-center transition-all cursor-pointer ${bgClass} ${
                                  isSelected
                                    ? 'ring-2 ring-inset ring-[#0284C7]'
                                    : 'hover:brightness-95'
                                }`}
                              >
                                <div className="flex items-center justify-center gap-1.5">
                                  {isDiag ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                                  ) : count > 0 ? (
                                    <AlertTriangle
                                      className={`w-4 h-4 ${
                                        model.isBinary && predCls === posLabel
                                          ? 'text-[#D97706]'
                                          : 'text-[#DC2626]'
                                      }`}
                                    />
                                  ) : null}
                                  <span
                                    className={`text-2xl font-bold font-mono tabular-nums ${textAccent}`}
                                  >
                                    {count}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] font-medium text-slate-600 tabular-nums">
                                  {pct}% del total
                                </div>
                                <div className="mt-0.5 text-[11px] font-semibold text-slate-700">
                                  {tagText}
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-600">
            <span>
              Aciertos totales:{' '}
              <strong className="text-[#059669] tabular-nums">
                {metrics.totalCorrect}
              </strong>{' '}
              · Errores totales:{' '}
              <strong className="text-[#DC2626] tabular-nums">
                {metrics.totalErrors}
              </strong>
            </span>
            <button
              type="button"
              onClick={onGoToGame}
              className="font-semibold text-[#0284C7] hover:text-sky-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              Practicar en el videojuego
            </button>
          </div>
        </div>

        {/* Cell Inspector Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                Inspector de casilla
              </h3>
              {selectedCell && (
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Ver muestra general
                </button>
              )}
            </div>

            {selectedCell ? (
              <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="font-semibold text-slate-900">
                  {getCellTag(selectedCell.actual, selectedCell.predicted)}
                </div>
                <p className="text-slate-600">
                  Etiqueta real: <strong>{selectedCell.actual}</strong> · Predicción:{' '}
                  <strong>{selectedCell.predicted}</strong> · Registros encontrados:{' '}
                  <strong className="tabular-nums">{inspectedRows.length}</strong>
                </p>
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-slate-600">
                Haz clic en una celda de la matriz (TP, TN, FP, FN o cualquier cruce multiclase) para revisar casos individuales del conjunto de prueba.
              </p>
            )}

            <div className="mt-4 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {inspectedRows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  No hubo registros en esta combinación exacta (0 casos).
                </div>
              ) : (
                inspectedRows.slice(0, 12).map((row) => {
                  const featureEntries = Object.entries(row.featuresSummary).slice(0, 3);
                  return (
                    <div
                      key={row.rowIndex}
                      className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-500 tabular-nums">
                          Prueba #{row.rowIndex}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            row.correct ? 'text-[#059669]' : 'text-[#DC2626]'
                          }`}
                        >
                          {row.correct ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {row.binaryOutcome ?? (row.correct ? 'Acierto' : 'Error')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span>
                          Real: <strong>{row.actual}</strong>
                        </span>
                        <span>
                          Predicho: <strong>{row.predicted}</strong>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {featureEntries
                          .map(([k, v]) => `${k}: ${v ?? 'N/A'}`)
                          .join(' · ')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {model.isBinary && binaryStats && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/70">
                <div className="text-[11px] font-semibold text-emerald-800">TP</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-950">
                  {binaryStats.tp}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200/70">
                <div className="text-[11px] font-semibold text-emerald-800">TN</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-950">
                  {binaryStats.tn}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/70">
                <div className="text-[11px] font-semibold text-amber-800">FP</div>
                <div className="text-base font-bold font-mono tabular-nums text-amber-950">
                  {binaryStats.fp}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-red-50 border border-red-200/70">
                <div className="text-[11px] font-semibold text-red-800">FN</div>
                <div className="text-base font-bold font-mono tabular-nums text-red-950">
                  {binaryStats.fn}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Multiclass Per-Class Breakdown */}
      {!model.isBinary && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Desglose por clase (One-vs-Rest en clasificación multiclase)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            En problemas con {metrics.classes.length} clases, cada categoría se evalúa frente a todas las demás para calcular su Precision, Recall, Especificidad y F1 propios.
          </p>

          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Clase</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Casos reales</th>
                  <th className="py-2.5 px-3 font-semibold text-right">TP</th>
                  <th className="py-2.5 px-3 font-semibold text-right">FP</th>
                  <th className="py-2.5 px-3 font-semibold text-right">FN</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Precision</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Recall</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Especificidad</th>
                  <th className="py-2.5 px-3 font-semibold text-right">F1-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.perClass.map((c) => (
                  <tr key={c.className} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {c.className}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {c.support}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#059669] font-semibold">
                      {c.tp}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700">
                      {c.fp}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-red-700">
                      {c.fn}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {(c.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {(c.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {(c.specificity * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#0284C7]">
                      {(c.f1 * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7 Metrics Deep-Dive Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              Guía interactiva de las 7 métricas clave
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Selecciona cualquier métrica para consultar su fórmula matemática, explicación sencilla, interpretación y ejemplo aplicado a tu conjunto de datos.
            </p>
          </div>
          {!model.isBinary && (
            <span className="text-xs text-slate-500">
              Mostrando promedios Macro entre {metrics.classes.length} clases
            </span>
          )}
        </div>

        {/* 7 Metric Selector Buttons */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {metricDetails.map((m) => {
            const val = metricValues[m.key];
            const active = activeMetric === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveMetric(m.key)}
                className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[#0284C7] bg-sky-50/60'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-medium text-slate-600 truncate">
                  {m.name.split(' (')[0]}
                </div>
                <div className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900">
                  {(val * 100).toFixed(1)}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Metric Pedagogical Card */}
        <div className="mt-6 p-6 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-semibold text-[#0284C7]">
              Métrica seleccionada
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              {currentMetricDetail.name}
            </h3>
            <div className="text-3xl font-bold font-mono tabular-nums text-slate-900">
              {(metricValues[currentMetricDetail.key] * 100).toFixed(2)}%
            </div>
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-500 mb-1">
                Fórmula matemática
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-900">
                {currentMetricDetail.formula}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 mb-2">
                <Info className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Explicación sencilla</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentMetricDetail.simple}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Interpretación del resultado
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {currentMetricDetail.interpretation}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-xs font-semibold text-slate-800 mb-2">
                Ejemplo en tu conjunto de datos
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {currentMetricDetail.appliedExample}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
