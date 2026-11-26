import { useEffect, useState } from 'react';
import {
  Compass,
  Menu,
  X,
} from 'lucide-react';
import { ConfusionMatrixLab } from './components/ConfusionMatrixLab';
import { DashboardModule } from './components/DashboardModule';
import { DataExplorerModule } from './components/DataExplorerModule';
import { GuidedTourModal } from './components/GuidedTourModal';
import { ModelTrainingModule } from './components/ModelTrainingModule';
import { QuestGameModule } from './components/QuestGameModule';
import { SAMPLE_DATASETS } from './data/sampleDatasets';
import {
  AlgorithmComparisonEntry,
  AppTab,
  DatasetInfo,
  GameProgress,
  TrainConfig,
  TrainedModelResult,
} from './types/ml';
import {
  suggestDefaultFeatures,
  suggestDefaultTarget,
} from './utils/dataParser';
import {
  compareAllAlgorithms,
  recalculateModelWithThreshold,
  trainClassificationModel,
} from './utils/mlEngine';

const HERO_IMAGE_PATH = '/src/assets/images/quest_hero_matrix_1795668940152.jpg';

const NAV_ITEMS: Array<{ id: AppTab; label: string }> = [
  { id: 'datos', label: 'Datos' },
  { id: 'modelo', label: 'Modelo' },
  { id: 'laboratorio', label: 'Laboratorio' },
  { id: 'videojuego', label: 'Videojuego' },
  { id: 'resultados', label: 'Resultados' },
];

function buildInitialConfig(dataset: DatasetInfo): TrainConfig {
  const targetColumn = suggestDefaultTarget(dataset.columns);
  const featureColumns = suggestDefaultFeatures(dataset.columns, targetColumn);
  const targetCol = dataset.columns.find((c) => c.name === targetColumn);
  const classes = targetCol?.classDistribution
    ? Object.keys(targetCol.classDistribution).sort()
    : [];

  // Pick meaningful positive class when binary (avoid "No", "Sano", "Legítima", "Permanece", "Riesgo Bajo")
  const preferredPos =
    classes.find((c) =>
      /(alto|fraude|cancela|enfermo|positivo|si|sí|defecto|riesgo|1)/i.test(c)
    ) ?? classes[0] ?? '';

  return {
    algorithm: 'random_forest',
    testSize: 0.25,
    targetColumn,
    featureColumns,
    positiveClass: preferredPos,
    threshold: 0.5,
    seed: 42,
  };
}

export default function App() {
  const initialDataset = SAMPLE_DATASETS[0];
  const initialConfig = buildInitialConfig(initialDataset);

  const [activeTab, setActiveTab] = useState<AppTab>('datos');
  const [dataset, setDataset] = useState<DatasetInfo>(initialDataset);
  const [config, setConfig] = useState<TrainConfig>(initialConfig);
  const [trainedModel, setTrainedModel] = useState<TrainedModelResult>(() =>
    trainClassificationModel(initialDataset, initialConfig)
  );
  const [comparison, setComparison] = useState<AlgorithmComparisonEntry[]>(() =>
    compareAllAlgorithms(initialDataset, initialConfig)
  );
  const [tourOpen, setTourOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null);

  const [gameProgress, setGameProgress] = useState<GameProgress>(() => {
    try {
      const saved = localStorage.getItem('cmq_game_progress_v1');
      if (saved) return JSON.parse(saved) as GameProgress;
    } catch {
      // Ignore storage error
    }
    return {
      xp: 0,
      lives: 3,
      maxLives: 3,
      completedLevels: [],
      unlockedBadges: [],
      levelScores: {},
      playerName: 'Estudiante de Analítica',
      soundEnabled: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('cmq_game_progress_v1', JSON.stringify(gameProgress));
    } catch {
      // Ignore storage error
    }
  }, [gameProgress]);

  const handleSelectDataset = (nextDataset: DatasetInfo) => {
    const nextCfg = buildInitialConfig(nextDataset);
    setDataset(nextDataset);
    setConfig(nextCfg);
    setTrainingNotice(null);
    if (nextCfg.featureColumns.length > 0) {
      const model = trainClassificationModel(nextDataset, nextCfg);
      setTrainedModel(model);
      setComparison(compareAllAlgorithms(nextDataset, nextCfg));
    }
  };

  const handleChangeTarget = (colName: string) => {
    const nextFeatures = suggestDefaultFeatures(dataset.columns, colName);
    const targetCol = dataset.columns.find((c) => c.name === colName);
    const classes = targetCol?.classDistribution
      ? Object.keys(targetCol.classDistribution).sort()
      : [];
    const preferredPos =
      classes.find((c) =>
        /(alto|fraude|cancela|enfermo|positivo|si|sí|defecto|riesgo|1)/i.test(c)
      ) ?? classes[0] ?? '';

    setConfig((prev) => ({
      ...prev,
      targetColumn: colName,
      featureColumns: nextFeatures,
      positiveClass: preferredPos,
    }));
  };

  const handleChangeFeatures = (cols: string[]) => {
    setConfig((prev) => ({ ...prev, featureColumns: cols }));
  };

  const handleChangeConfig = (partial: Partial<TrainConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const handleTrainSelected = () => {
    try {
      const result = trainClassificationModel(dataset, config);
      setTrainedModel(result);
      setTrainingNotice(
        `Modelo ${result.algorithmName} entrenado (${(
          result.metrics.macroAccuracy * 100
        ).toFixed(1)}% Accuracy).`
      );
      setActiveTab('laboratorio');
    } catch (err) {
      setTrainingNotice(
        err instanceof Error ? err.message : 'Error al entrenar el modelo.'
      );
    }
  };

  const handleRunComparison = () => {
    const comp = compareAllAlgorithms(dataset, config);
    setComparison(comp);
  };

  const handleTrainAndCompareAll = () => {
    const result = trainClassificationModel(dataset, config);
    const comp = compareAllAlgorithms(dataset, config);
    setTrainedModel(result);
    setComparison(comp);
    setActiveTab('resultados');
  };

  const handleThresholdChange = (newThreshold: number) => {
    setConfig((prev) => ({ ...prev, threshold: newThreshold }));
    setTrainedModel((prev) =>
      recalculateModelWithThreshold(prev, newThreshold)
    );
  };

  const handlePositiveClassChange = (newPos: string) => {
    setConfig((prev) => ({ ...prev, positiveClass: newPos }));
    setTrainedModel((prev) =>
      recalculateModelWithThreshold(prev, prev.threshold, newPos)
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('datos')}
            className="text-lg font-bold tracking-tight text-[#0F172A] font-display whitespace-nowrap shrink-0 cursor-pointer"
          >
            Confusion Matrix Quest
          </button>

          {/* Zone 2: 5 concise single-line text links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-[#0284C7] text-[#0F172A] font-semibold'
                      : 'border-transparent text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setTourOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              Tour guiado
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Abrir menú"
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 cursor-pointer"
            >
              {mobileNavOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === item.id
                    ? 'bg-sky-50 text-[#0284C7] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setTourOpen(true);
              }}
              className="w-full mt-2 px-3 py-2.5 bg-[#0F172A] text-white text-xs font-semibold rounded-lg text-center"
            >
              Tour guiado
            </button>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Stage shown cleanly on Datos tab */}
        {activeTab === 'datos' && (
          <section className="bg-[#0F172A] text-white rounded-2xl overflow-hidden border border-slate-800 grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-sky-400">
                  Aprende jugando con Machine Learning
                </div>
                <h1
                  className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white"
                  style={{ textWrap: 'balance' }}
                >
                  Domina las Matrices de Confusión con datos reales y retos interactivos
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  Carga conjuntos de datos de cualquier sector, entrena modelos de clasificación sin filtración de datos, inspecciona cada casilla TP/TN/FP/FN y descarga reportes HTML autónomos.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('videojuego')}
                  className="px-5 py-2.5 bg-[#0284C7] hover:bg-sky-600 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Jugar los 5 niveles
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('laboratorio')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold rounded-lg border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Abrir laboratorio
                </button>
                <span className="text-xs text-slate-400 tabular-nums">
                  {gameProgress.xp} XP · {gameProgress.completedLevels.length}/5 niveles completados
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 relative min-h-[220px] bg-slate-900">
              {!heroImgFailed ? (
                <img
                  src={HERO_IMAGE_PATH}
                  alt="Ilustración científica isométrica de clasificación hacia una matriz de confusión"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
                  <div className="grid grid-cols-2 gap-3 w-48">
                    <div className="p-4 rounded-lg bg-emerald-950/70 border border-emerald-700/50 text-center font-mono text-sm font-bold text-emerald-300">
                      TP
                    </div>
                    <div className="p-4 rounded-lg bg-red-950/70 border border-red-700/50 text-center font-mono text-sm font-bold text-red-300">
                      FN
                    </div>
                    <div className="p-4 rounded-lg bg-amber-950/70 border border-amber-700/50 text-center font-mono text-sm font-bold text-amber-300">
                      FP
                    </div>
                    <div className="p-4 rounded-lg bg-emerald-950/70 border border-emerald-700/50 text-center font-mono text-sm font-bold text-emerald-300">
                      TN
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Active Dataset & Model Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Datos activos: <strong className="text-slate-900">{dataset.name}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Objetivo: <strong className="text-slate-900">{config.targetColumn}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Modelo: <strong className="text-[#0284C7]">{trainedModel.algorithmName}</strong>
            </span>
          </div>
          {trainingNotice && (
            <span className="font-medium text-[#059669]">{trainingNotice}</span>
          )}
        </div>

        {/* Active Module Content */}
        {activeTab === 'datos' && (
          <DataExplorerModule
            dataset={dataset}
            sampleDatasets={SAMPLE_DATASETS}
            targetColumn={config.targetColumn}
            featureColumns={config.featureColumns}
            onSelectDataset={handleSelectDataset}
            onChangeTarget={handleChangeTarget}
            onChangeFeatures={handleChangeFeatures}
            onProceedToTrain={() => setActiveTab('modelo')}
          />
        )}

        {activeTab === 'modelo' && (
          <ModelTrainingModule
            dataset={dataset}
            config={config}
            trainedModel={trainedModel}
            onChangeConfig={handleChangeConfig}
            onTrainSelected={handleTrainSelected}
            onTrainAndCompareAll={handleTrainAndCompareAll}
            onGoToLab={() => setActiveTab('laboratorio')}
          />
        )}

        {activeTab === 'laboratorio' && (
          <ConfusionMatrixLab
            model={trainedModel}
            onChangeThreshold={handleThresholdChange}
            onChangePositiveClass={handlePositiveClassChange}
            onGoToGame={() => setActiveTab('videojuego')}
          />
        )}

        {activeTab === 'videojuego' && (
          <QuestGameModule
            progress={gameProgress}
            trainedModel={trainedModel}
            onUpdateProgress={setGameProgress}
          />
        )}

        {activeTab === 'resultados' && (
          <DashboardModule
            model={trainedModel}
            comparison={comparison}
            onRunComparison={handleRunComparison}
          />
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            CONFUSION MATRIX QUEST · Procesamiento local en navegador para aprendizaje de Machine Learning
          </span>
          <button
            type="button"
            onClick={() => setTourOpen(true)}
            className="font-medium text-[#0284C7] hover:text-sky-700 cursor-pointer"
          >
            Ver recorrido de demostración
          </button>
        </div>
      </footer>

      <GuidedTourModal
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onNavigateTab={(t) => setActiveTab(t)}
      />
    </div>
  );
}
