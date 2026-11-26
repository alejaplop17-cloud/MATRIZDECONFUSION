import React from 'react';
import { CheckCircle2, Play, ShieldCheck, Sliders, Layers } from 'lucide-react';
import {
  AlgorithmId,
  DatasetInfo,
  TrainConfig,
  TrainedModelResult,
} from '../types/ml';
import { ALGORITHMS } from '../utils/mlEngine';

interface ModelTrainingModuleProps {
  dataset: DatasetInfo;
  config: TrainConfig;
  trainedModel: TrainedModelResult | null;
  onChangeConfig: (next: Partial<TrainConfig>) => void;
  onTrainSelected: () => void;
  onTrainAndCompareAll: () => void;
  onGoToLab: () => void;
}

export const ModelTrainingModule: React.FC<ModelTrainingModuleProps> = ({
  dataset,
  config,
  trainedModel,
  onChangeConfig,
  onTrainSelected,
  onTrainAndCompareAll,
  onGoToLab,
}) => {
  const targetCol = dataset.columns.find((c) => c.name === config.targetColumn);
  const classes = targetCol?.classDistribution
    ? Object.keys(targetCol.classDistribution).sort()
    : [];
  const isBinary = classes.length === 2;

  const validRowsCount = dataset.rows.filter((r) => {
    const t = r[config.targetColumn];
    return t !== null && t !== undefined && String(t).trim() !== '';
  }).length;

  const testCount = Math.max(1, Math.round(validRowsCount * config.testSize));
  const trainCount = Math.max(1, validRowsCount - testCount);
  const trainPct = Math.round((1 - config.testSize) * 100);
  const testPct = Math.round(config.testSize * 100);

  return (
    <div className="space-y-8">
      {/* Header & Pipeline Safeguard */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            01. Selecciona el algoritmo de clasificación
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Elige cómo aprenderá el modelo los patrones de tus variables predictoras para predecir{' '}
            <strong className="text-slate-900">{config.targetColumn}</strong>.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {ALGORITHMS.map((algo) => {
              const selected = config.algorithm === algo.id;
              return (
                <button
                  key={algo.id}
                  type="button"
                  onClick={() =>
                    onChangeConfig({ algorithm: algo.id as AlgorithmId })
                  }
                  className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                    selected
                      ? 'border-[#0284C7] bg-sky-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {algo.name}
                    </span>
                    {selected && (
                      <span className="text-xs font-semibold text-[#0284C7]">
                        Seleccionado
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                    {algo.description}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-700">
                    Ventaja: {algo.strengths}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Split & Anti-Leakage Column */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <h2 className="text-lg font-semibold">
                  02. Partición Entrenamiento / Prueba
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Se utiliza muestreo estratificado para conservar la proporción real de clases en ambos conjuntos.
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2 tabular-nums">
                  <span>Entrenamiento: {trainPct}% ({trainCount} filas)</span>
                  <span>Prueba: {testPct}% ({testCount} filas)</span>
                </div>
                <input
                  id="test-size-slider"
                  type="range"
                  min={15}
                  max={40}
                  step={5}
                  value={testPct}
                  onChange={(e) =>
                    onChangeConfig({ testSize: Number(e.target.value) / 100 })
                  }
                  className="w-full cursor-pointer"
                  aria-label="Porcentaje de datos para prueba"
                />
                <div className="mt-2 h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                  <div
                    className="h-full bg-[#0F172A] transition-all"
                    style={{ width: `${trainPct}%` }}
                  />
                  <div
                    className="h-full bg-[#0284C7] transition-all"
                    style={{ width: `${testPct}%` }}
                  />
                </div>
              </div>
            </div>

            {isBinary && (
              <div className="pt-4 border-t border-slate-100">
                <label
                  htmlFor="positive-class-select"
                  className="block text-xs font-semibold text-slate-800 mb-1.5"
                >
                  Clase Positiva de interés (para TP / FP / FN / TN)
                </label>
                <select
                  id="positive-class-select"
                  value={config.positiveClass}
                  onChange={(e) =>
                    onChangeConfig({ positiveClass: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                >
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Define qué etiqueta representa el evento que queremos detectar (ej. Fraude, Riesgo Alto, Cancela).
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <span>Protección contra Data Leakage</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                La imputación de valores faltantes (mediana/moda), el escalado Z-score y la codificación One-Hot se calculan exclusivamente sobre el conjunto de entrenamiento y luego se aplican al de prueba.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
            <button
              type="button"
              onClick={onTrainSelected}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0284C7] text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              Entrenar modelo y generar matriz
            </button>
            <button
              type="button"
              onClick={onTrainAndCompareAll}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Entrenar y comparar los 5 algoritmos
            </button>
          </div>
        </div>
      </section>

      {/* Preprocessing & Training Execution Summary */}
      {trainedModel && (
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Modelo entrenado: {trainedModel.algorithmName}
                </h3>
                <p className="text-xs text-slate-500">
                  Conjunto: {trainedModel.datasetName} · Tiempo de ejecución:{' '}
                  <span className="font-mono tabular-nums">
                    {trainedModel.trainingTimeMs} ms
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToLab}
              className="px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Explorar matriz de confusión
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Preprocesamiento aplicado
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {trainedModel.preprocessing.notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
                <li>
                  • Dimensionalidad final tras codificación:{' '}
                  <strong className="text-slate-900 tabular-nums">
                    {trainedModel.preprocessing.encodedFeatureCount} columnas
                  </strong>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Balance en entrenamiento ({trainedModel.preprocessing.trainCount} filas)
              </h4>
              <div className="space-y-1.5">
                {Object.entries(trainedModel.trainClassDistribution).map(
                  ([cls, count]) => (
                    <div
                      key={cls}
                      className="flex justify-between text-xs text-slate-600 tabular-nums"
                    >
                      <span>{cls}</span>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-700 mb-2">
                Balance en prueba ({trainedModel.preprocessing.testCount} filas)
              </h4>
              <div className="space-y-1.5">
                {Object.entries(trainedModel.testClassDistribution).map(
                  ([cls, count]) => (
                    <div
                      key={cls}
                      className="flex justify-between text-xs text-slate-600 tabular-nums"
                    >
                      <span>{cls}</span>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
