import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { ColumnProfile, DatasetInfo, ProblemType } from '../types/ml';
import {
  datasetToCsv,
  detectProblemType,
  parseUploadedFile,
} from '../utils/dataParser';
import { downloadCsvFile } from '../utils/htmlExporter';

interface DataExplorerModuleProps {
  dataset: DatasetInfo;
  sampleDatasets: DatasetInfo[];
  targetColumn: string;
  featureColumns: string[];
  onSelectDataset: (dataset: DatasetInfo) => void;
  onChangeTarget: (colName: string) => void;
  onChangeFeatures: (cols: string[]) => void;
  onProceedToTrain: () => void;
}

export const DataExplorerModule: React.FC<DataExplorerModuleProps> = ({
  dataset,
  sampleDatasets,
  targetColumn,
  featureColumns,
  onSelectDataset,
  onChangeTarget,
  onChangeFeatures,
  onProceedToTrain,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const targetProfile = dataset.columns.find((c) => c.name === targetColumn);
  const problemType: ProblemType = detectProblemType(targetProfile);

  const numericCount = dataset.columns.filter((c) => c.type === 'numeric').length;
  const categoricalCount = dataset.columns.filter((c) => c.type === 'categorical').length;
  const candidateTargets = dataset.columns.filter((c) => c.targetCandidate);
  const previewRows = dataset.rows.slice(0, 5);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setIsParsing(true);
    try {
      const parsed = await parseUploadedFile(files[0]);
      onSelectDataset(parsed);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'No se pudo leer el archivo seleccionado.'
      );
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleFeature = (colName: string) => {
    if (colName === targetColumn) return;
    if (featureColumns.includes(colName)) {
      onChangeFeatures(featureColumns.filter((f) => f !== colName));
    } else {
      onChangeFeatures([...featureColumns, colName]);
    }
  };

  const selectAllFeatures = () => {
    onChangeFeatures(
      dataset.columns.filter((c) => c.name !== targetColumn).map((c) => c.name)
    );
  };

  const selectNumericFeatures = () => {
    onChangeFeatures(
      dataset.columns
        .filter((c) => c.name !== targetColumn && c.type === 'numeric')
        .map((c) => c.name)
    );
  };

  const handleDownloadSample = () => {
    downloadCsvFile(dataset.fileName, datasetToCsv(dataset));
  };

  const problemLabel =
    problemType === 'binary'
      ? `Clasificación binaria (${targetProfile?.uniqueCount ?? 2} clases)`
      : problemType === 'multiclass'
      ? `Clasificación multiclase (${targetProfile?.uniqueCount ?? 0} clases)`
      : 'Variable no apta para clasificación (elige entre 2 y 15 clases)';

  return (
    <div className="space-y-8">
      {/* Intro & Upload / Sample Selector Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
              01. Carga local de datos
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Sube cualquier archivo tabular en formato CSV, TXT, XLS o XLSX. Todo el procesamiento ocurre localmente en tu navegador sin enviar datos a servidores externos.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`mt-5 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive
                  ? 'border-[#0284C7] bg-sky-50/70'
                  : 'border-slate-300 bg-slate-50/60 hover:border-slate-400'
              }`}
            >
              <Upload className="w-7 h-7 mx-auto text-slate-500 mb-3" />
              <p className="text-sm font-medium text-slate-800">
                {isParsing
                  ? 'Procesando archivo...'
                  : 'Arrastra tu archivo aquí o selecciónalo desde tu equipo'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Formatos admitidos: .csv · .txt · .xls · .xlsx
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xls,.xlsx"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Seleccionar archivo
              </button>
            </div>

            {uploadError && (
              <div
                role="alert"
                className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-slate-500">
              ¿Necesitas un CSV de prueba?
            </span>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] hover:text-sky-700 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar conjunto activo (.csv)
            </button>
          </div>
        </div>

        {/* Sample Sector Datasets */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
                Bases de datos de demostración por sector
              </h2>
              <span className="text-xs text-slate-500">
                {sampleDatasets.length} sectores listos para explorar
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Prueba distintos escenarios económicos (binarios, desbalanceados y multiclase) con un clic.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {sampleDatasets.map((sample) => {
                const isSelected = dataset.id === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setUploadError(null);
                      onSelectDataset(sample);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0284C7] bg-sky-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{sample.sector}</span>
                        <span className="tabular-nums">
                          {sample.rows.length} filas · {sample.columns.length} cols
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-slate-900">
                        {sample.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {sample.description}
                      </p>
                    </div>
                    <div className="mt-3 text-xs font-medium text-[#0284C7]">
                      {isSelected ? 'Conjunto activo' : 'Cargar conjunto'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-500">
            <span>
              Archivo activo: <strong className="text-slate-800">{dataset.fileName}</strong>
            </span>
            <span>Sector: {dataset.sector}</span>
          </div>
        </div>
      </section>

      {/* Automatic Dataset Diagnostics KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Diagnóstico automático del conjunto de datos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {dataset.name} · {dataset.sector}
            </p>
          </div>
          <span
            className={`text-xs font-semibold ${
              problemType === 'invalid' ? 'text-red-700' : 'text-[#059669]'
            }`}
          >
            {problemLabel}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Registros</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {dataset.rows.length}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Columnas</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {dataset.columns.length}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Numéricas</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {numericCount}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Categóricas</div>
            <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
              {categoricalCount}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Valores faltantes</div>
            <div className="mt-1 text-2xl font-bold text-amber-700 tabular-nums">
              {dataset.totalMissing}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-xs text-slate-500">Candidatas a Target</div>
            <div className="mt-1 text-2xl font-bold text-[#0284C7] tabular-nums">
              {candidateTargets.length}
            </div>
          </div>
        </div>
      </section>

      {/* First 5 Rows Preview */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Vista previa (primeras 5 filas)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Las celdas vacías se marcarán como faltantes y serán imputadas automáticamente durante el entrenamiento.
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums">
            Mostrando 5 de {dataset.rows.length} registros
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold text-slate-500 tabular-nums">#</th>
                {dataset.columns.map((col) => (
                  <th
                    key={col.name}
                    className={`py-2.5 px-3 font-semibold whitespace-nowrap ${
                      col.name === targetColumn
                        ? 'text-[#0284C7] bg-sky-50/70'
                        : 'text-slate-700'
                    }`}
                  >
                    {col.name}
                    {col.name === targetColumn && ' (Objetivo)'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 text-slate-400 tabular-nums">{idx + 1}</td>
                  {dataset.columns.map((col) => {
                    const val = row[col.name];
                    const isMissing = val === null || val === undefined || val === '';
                    return (
                      <td
                        key={col.name}
                        className={`py-2.5 px-3 whitespace-nowrap ${
                          col.type === 'numeric' ? 'font-mono tabular-nums' : ''
                        } ${
                          isMissing
                            ? 'text-amber-700 bg-amber-50/60 italic'
                            : col.name === targetColumn
                            ? 'font-semibold text-slate-900 bg-sky-50/30'
                            : 'text-slate-700'
                        }`}
                      >
                        {isMissing ? 'Faltante' : String(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Variable Selection & Schema Profiler */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Target Variable Selector */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            02. Selecciona la variable objetivo (Target)
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Es la etiqueta o categoría que el modelo aprenderá a predecir. Se destacan las columnas sugeridas automáticamente.
          </p>

          <div className="mt-4">
            <label
              htmlFor="target-select"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Variable objetivo
            </label>
            <select
              id="target-select"
              value={targetColumn}
              onChange={(e) => onChangeTarget(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0284C7]"
            >
              {dataset.columns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name} · {col.uniqueCount} valores ({col.type === 'numeric' ? 'Numérica' : 'Categórica'})
                  {col.targetCandidate ? ' — Sugerida' : ''}
                </option>
              ))}
            </select>
          </div>

          {targetProfile && (
            <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Tipo detectado</span>
                <span className="font-semibold text-slate-900">
                  {problemType === 'binary'
                    ? 'Clasificación binaria'
                    : problemType === 'multiclass'
                    ? 'Clasificación multiclase'
                    : 'No recomendada para clasificación'}
                </span>
              </div>
              <p className="text-xs text-slate-600">{targetProfile.targetReason}</p>
              {targetProfile.classDistribution && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-medium text-slate-700">
                    Distribución de clases:
                  </div>
                  {Object.entries(targetProfile.classDistribution).map(
                    ([cls, count]) => {
                      const pct = Math.round((count / dataset.rows.length) * 100);
                      return (
                        <div key={cls} className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-700 tabular-nums">
                            <span className="truncate max-w-[180px]">{cls}</span>
                            <span>
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0284C7] rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Predictor Variables Checklist */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                03. Variables predictoras ({featureColumns.length} seleccionadas)
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Marca las columnas de entrada que usará el modelo. Evita incluir códigos identificadores únicos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllFeatures}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={selectNumericFeatures}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Solo numéricas
              </button>
              <button
                type="button"
                onClick={() => onChangeFeatures([])}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3 font-semibold">Usar</th>
                  <th className="py-2.5 px-3 font-semibold">Variable</th>
                  <th className="py-2.5 px-3 font-semibold">Tipo</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Únicos</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Faltantes</th>
                  <th className="py-2.5 px-3 font-semibold">Ejemplos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dataset.columns.map((col: ColumnProfile) => {
                  const isTarget = col.name === targetColumn;
                  const checked = featureColumns.includes(col.name);
                  return (
                    <tr
                      key={col.name}
                      onClick={() => !isTarget && toggleFeature(col.name)}
                      className={`${
                        isTarget
                          ? 'bg-sky-50/40 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded border ${
                            isTarget
                              ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : checked
                              ? 'border-[#0284C7] bg-[#0284C7] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && !isTarget && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {col.name}
                        {isTarget && (
                          <span className="ml-2 text-[#0284C7] font-semibold">
                            (Objetivo)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {col.type === 'numeric' ? 'Numérica' : 'Categórica'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {col.uniqueCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                        {col.missingCount}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-[180px] truncate">
                        {col.sampleValues.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Database className="w-4 h-4 text-slate-400" />
              <span>
                {featureColumns.length > 0 && problemType !== 'invalid'
                  ? 'Configuración lista para entrenar el modelo.'
                  : 'Selecciona un objetivo válido (2–15 clases) y al menos 1 predictora.'}
              </span>
            </div>
            <button
              type="button"
              disabled={featureColumns.length === 0 || problemType === 'invalid'}
              onClick={onProceedToTrain}
              className="px-5 py-2.5 bg-[#0284C7] text-white text-sm font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continuar a entrenamiento
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
