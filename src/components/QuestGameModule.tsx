import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Heart,
  Play,
  RotateCcw,
  ShieldAlert,
  Trophy,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import {
  LEVEL_1_ROUNDS,
  LEVEL_2_ROUNDS,
  LEVEL_3_ROUNDS,
  LEVEL_4_ROUNDS,
  QUEST_BADGES,
} from '../data/questContent';
import { BadgeId, GameProgress, TrainedModelResult } from '../types/ml';
import { downloadCertificateHtml } from '../utils/htmlExporter';
import { playGameTone } from '../utils/soundFx';

interface QuestGameModuleProps {
  progress: GameProgress;
  trainedModel: TrainedModelResult;
  onUpdateProgress: (updater: (prev: GameProgress) => GameProgress) => void;
}

type ActiveScreen = 'map' | 'playing' | 'level_complete' | 'game_over' | 'certificate';

const CERTIFICATE_SEAL_PATH = '/src/assets/images/certificate_seal_1795668940548.jpg';

export const QuestGameModule: React.FC<QuestGameModuleProps> = ({
  progress,
  trainedModel,
  onUpdateProgress,
}) => {
  const [screen, setScreen] = useState<ActiveScreen>('map');
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [roundIdx, setRoundIdx] = useState<number>(0);
  const [levelPoints, setLevelPoints] = useState<number>(0);
  const [lives, setLives] = useState<number>(progress.maxLives);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  // Level 2 matrix inputs
  const [l2Input, setL2Input] = useState({ tp: '', fn: '', fp: '', tn: '' });

  // Level 5 dynamic reflection & audit answers
  const [l5SuitabilityNote, setL5SuitabilityNote] = useState('');

  // Dynamic Level 5 questions derived from the user's real trainedModel
  const level5Questions = useMemo(() => {
    const m = trainedModel.metrics;
    const bin = m.binary;

    // Q1: Identify dominant error type
    let q1Prompt = '';
    let q1Options: string[] = [];
    let q1CorrectIdx = 0;
    let q1Explanation = '';

    if (trainedModel.isBinary && bin) {
      q1Prompt = `En tu modelo "${trainedModel.algorithmName}" sobre "${trainedModel.datasetName}" (clase positiva: "${trainedModel.positiveClass}"), ¿qué tipo de error ocurre con mayor frecuencia?`;
      if (bin.fn > bin.fp) {
        q1Options = [
          `Falsos Negativos (${bin.fn} casos reales de "${trainedModel.positiveClass}" no detectados)`,
          `Falsos Positivos (${bin.fp} falsas alarmas)`,
          'Ambos errores ocurren exactamente cero veces',
        ];
        q1CorrectIdx = 0;
        q1Explanation = `En la matriz real hay ${bin.fn} Falsos Negativos frente a ${bin.fp} Falsos Positivos, lo que reduce el Recall a ${(bin.recall * 100).toFixed(1)}%.`;
      } else if (bin.fp > bin.fn) {
        q1Options = [
          `Falsos Negativos (${bin.fn} omisiones)`,
          `Falsos Positivos (${bin.fp} casos negativos clasificados como "${trainedModel.positiveClass}")`,
          'Ambos errores son idénticos en cantidad y sin impacto',
        ];
        q1CorrectIdx = 1;
        q1Explanation = `En la matriz real hay ${bin.fp} Falsos Positivos frente a ${bin.fn} Falsos Negativos, lo que afecta la Precision (${(bin.precision * 100).toFixed(1)}%).`;
      } else {
        q1Options = [
          `Equilibrio exacto entre FP (${bin.fp}) y FN (${bin.fn})`,
          'Exclusivamente Falsos Positivos',
          'Exclusivamente Falsos Negativos',
        ];
        q1CorrectIdx = 0;
        q1Explanation = `Tanto FP como FN registran exactamente ${bin.fp} casos en el conjunto de prueba.`;
      }
    } else {
      const sortedWeak = [...m.perClass].sort((a, b) => a.f1 - b.f1);
      const weakest = sortedWeak[0];
      const strongest = sortedWeak[sortedWeak.length - 1];
      q1Prompt = `En tu modelo multiclase sobre "${trainedModel.datasetName}", ¿qué clase presenta el F1-Score más bajo y requiere mayor atención?`;
      q1Options = m.perClass.map(
        (c) => `${c.className} (F1: ${(c.f1 * 100).toFixed(1)}%)`
      );
      q1CorrectIdx = m.perClass.findIndex(
        (c) => c.className === weakest.className
      );
      q1Explanation = `La clase "${weakest.className}" obtuvo un F1-Score de ${(weakest.f1 * 100).toFixed(1)}%, frente a "${strongest.className}" con ${(strongest.f1 * 100).toFixed(1)}%.`;
    }

    // Q2: Precision vs Recall check
    const precVal = bin ? bin.precision : m.macroPrecision;
    const recVal = bin ? bin.recall : m.macroRecall;
    const q2Prompt = `Observando tus resultados (Precision = ${(precVal * 100).toFixed(1)}%, Recall = ${(recVal * 100).toFixed(1)}%), ¿qué métrica es mayor actualmente?`;
    const q2Options = [
      'Precision es mayor o igual que Recall (menos falsas alarmas relativas)',
      'Recall es mayor que Precision (captura más positivos, aunque con más falsas alarmas)',
    ];
    const q2CorrectIdx = precVal >= recVal ? 0 : 1;
    const q2Explanation = `Con Precision = ${(precVal * 100).toFixed(1)}% y Recall = ${(recVal * 100).toFixed(1)}%, ${
      precVal >= recVal
        ? 'la Precision supera o iguala al Recall, indicando que cuando predice positivo suele ser confiable.'
        : 'el Recall supera a la Precision, indicando buena cobertura de casos positivos pero con algunas falsas alarmas.'
    }`;

    // Q3: Model adequacy decision with justification
    const accVal = m.macroAccuracy;
    const f1Val = bin ? bin.f1 : m.macroF1;
    const isAdequate = accVal >= 0.78 && f1Val >= 0.72;
    const q3Prompt = `Considerando un Accuracy de ${(accVal * 100).toFixed(1)}% y F1-Score de ${(f1Val * 100).toFixed(1)}% en "${trainedModel.datasetName}", ¿cuál es el diagnóstico técnico más acertado?`;
    const q3Options = [
      'Es un modelo prometedor/adecuado para apoyar decisiones, monitoreando siempre el error más costoso del sector.',
      'Debe rechazarse o ajustarse primero (umbral, variables o algoritmo) antes de usarse en producción por su tasa de error.',
    ];
    const q3CorrectIdx = isAdequate ? 0 : 1;
    const q3Explanation = isAdequate
      ? `Con ${(accVal * 100).toFixed(1)}% de Accuracy y ${(f1Val * 100).toFixed(1)}% de F1-Score el modelo tiene base sólida; aun así, siempre conviene supervisar los casos críticos.`
      : `Un Accuracy de ${(accVal * 100).toFixed(1)}% y F1 de ${(f1Val * 100).toFixed(1)}% indican margen de mejora relevante. Prueba otro algoritmo o ajusta el umbral en el Laboratorio.`;

    return [
      {
        prompt: q1Prompt,
        options: q1Options,
        correctIdx: q1CorrectIdx,
        explanation: q1Explanation,
      },
      {
        prompt: q2Prompt,
        options: q2Options,
        correctIdx: q2CorrectIdx,
        explanation: q2Explanation,
      },
      {
        prompt: q3Prompt,
        options: q3Options,
        correctIdx: q3CorrectIdx,
        explanation: q3Explanation,
      },
    ];
  }, [trainedModel]);

  const startLevel = (lvl: number) => {
    setCurrentLevel(lvl);
    setRoundIdx(0);
    setLevelPoints(0);
    setLives(progress.maxLives);
    setFeedback(null);
    setL2Input({ tp: '', fn: '', fp: '', tn: '' });
    setScreen('playing');
  };

  const totalRoundsForLevel = (lvl: number) => {
    if (lvl === 1) return LEVEL_1_ROUNDS.length;
    if (lvl === 2) return LEVEL_2_ROUNDS.length;
    if (lvl === 3) return LEVEL_3_ROUNDS.length;
    if (lvl === 4) return LEVEL_4_ROUNDS.length;
    return level5Questions.length;
  };

  const handleAnswerResult = (isCorrect: boolean, explanation: string) => {
    if (feedback) return;

    if (isCorrect) {
      playGameTone('correct', progress.soundEnabled);
      setLevelPoints((p) => p + 100);
      setFeedback({
        correct: true,
        message: `¡Correcto! +100 XP · ${explanation}`,
      });
    } else {
      playGameTone('wrong', progress.soundEnabled);
      const nextLives = lives - 1;
      setLives(nextLives);
      setFeedback({
        correct: false,
        message: `Incorrecto (-1 vida). ${explanation}`,
      });
      if (nextLives <= 0) {
        setTimeout(() => {
          setScreen('game_over');
        }, 900);
      }
    }
  };

  const handleNextRound = () => {
    const total = totalRoundsForLevel(currentLevel);
    if (roundIdx + 1 >= total) {
      // Level complete!
      playGameTone('levelUp', progress.soundEnabled);
      const bonus = lives * 25;
      const earned = levelPoints + bonus;
      const badgeId = `nivel_${currentLevel}` as BadgeId;

      onUpdateProgress((prev) => {
        const completed = prev.completedLevels.includes(currentLevel)
          ? prev.completedLevels
          : [...prev.completedLevels, currentLevel].sort();
        const badges = prev.unlockedBadges.includes(badgeId)
          ? prev.unlockedBadges
          : [...prev.unlockedBadges, badgeId];
        const prevBest = prev.levelScores[currentLevel] ?? 0;
        const deltaXp = earned > prevBest ? earned - prevBest : 0;

        return {
          ...prev,
          xp: prev.xp + (prevBest === 0 ? earned : deltaXp),
          completedLevels: completed,
          unlockedBadges: badges,
          levelScores: {
            ...prev.levelScores,
            [currentLevel]: Math.max(prevBest, earned),
          },
        };
      });

      setScreen('level_complete');
    } else {
      setRoundIdx((r) => r + 1);
      setFeedback(null);
      setL2Input({ tp: '', fn: '', fp: '', tn: '' });
    }
  };

  const submitLevel2Matrix = (e: React.FormEvent) => {
    e.preventDefault();
    const round = LEVEL_2_ROUNDS[roundIdx];
    const tp = Number(l2Input.tp);
    const fn = Number(l2Input.fn);
    const fp = Number(l2Input.fp);
    const tn = Number(l2Input.tn);

    const isOk =
      tp === round.expected.tp &&
      fn === round.expected.fn &&
      fp === round.expected.fp &&
      tn === round.expected.tn;

    handleAnswerResult(
      isOk,
      `La matriz exacta es TP=${round.expected.tp}, FN=${round.expected.fn}, FP=${round.expected.fp}, TN=${round.expected.tn}.`
    );
  };

  const completedCount = progress.completedLevels.length;
  const overallProgressPct = Math.round((completedCount / 5) * 100);
  const allCompleted = completedCount >= 5;

  return (
    <div className="space-y-8">
      {/* Game HUD Bar */}
      <section className="bg-[#0F172A] text-white rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-xs text-slate-400">Puntuación acumulada</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-white">
              {progress.xp} XP
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div>
            <div className="text-xs text-slate-400">Vidas en intento actual</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              {Array.from({ length: progress.maxLives }, (_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 ${
                    i < lives
                      ? 'text-red-500 fill-red-500'
                      : 'text-slate-600'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-mono tabular-nums text-slate-200">
                {lives}/{progress.maxLives}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden sm:block" />

          <div className="min-w-[180px]">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5 tabular-nums">
              <span>Progreso del curso</span>
              <span>{completedCount}/5 niveles ({overallProgressPct}%)</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0284C7] transition-all"
                style={{ width: `${overallProgressPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() =>
              onUpdateProgress((p) => ({
                ...p,
                soundEnabled: !p.soundEnabled,
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {progress.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#0284C7]" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            {progress.soundEnabled ? 'Sonido activo' : 'Silenciado'}
          </button>

          {allCompleted && (
            <button
              type="button"
              onClick={() => setScreen('certificate')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Award className="w-4 h-4" />
              Ver Certificado
            </button>
          )}

          {screen !== 'map' && (
            <button
              type="button"
              onClick={() => setScreen('map')}
              className="px-3.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Volver al mapa
            </button>
          )}
        </div>
      </section>

      {/* SCREEN: LEVEL MAP & BADGES */}
      {screen === 'map' && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {QUEST_BADGES.map((b) => {
              const isDone = progress.completedLevels.includes(b.level);
              const bestScore = progress.levelScores[b.level] ?? 0;
              return (
                <div
                  key={b.id}
                  className={`bg-white border rounded-xl p-6 flex flex-col justify-between transition-colors ${
                    isDone ? 'border-emerald-300' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#0284C7]">
                        Nivel {b.level}
                      </span>
                      <span
                        className={`font-semibold ${
                          isDone ? 'text-[#059669]' : 'text-slate-400'
                        }`}
                      >
                        {isDone
                          ? `Completado · ${bestScore} XP`
                          : 'Pendiente'}
                      </span>
                    </div>

                    <h3 className="mt-2 text-lg font-semibold text-slate-900">
                      {b.level === 1 && 'Reconoce los resultados'}
                      {b.level === 2 && 'Construye la matriz'}
                      {b.level === 3 && 'Detectives de errores'}
                      {b.level === 4 && 'Maestro de las métricas'}
                      {b.level === 5 && 'Reto final con tus datos'}
                    </h3>

                    <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                      {b.level === 1 &&
                        'Clasifica casos reales de predicción en TP, TN, FP o FN.'}
                      {b.level === 2 &&
                        'Transforma listas de etiquetas reales y predichas en una matriz de confusión completa.'}
                      {b.level === 3 &&
                        'Analiza consecuencias empresariales en Salud, Finanzas, Marketing, Comercio, Industria y Movilidad.'}
                      {b.level === 4 &&
                        'Calcula Accuracy, Precision, Recall, Especificidad y F1-Score directamente sobre matrices.'}
                      {b.level === 5 &&
                        `Audita el modelo real "${trainedModel.algorithmName}" entrenado sobre "${trainedModel.datasetName}".`}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      Insignia: {b.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => startLevel(b.level)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isDone ? 'Rejugar' : 'Jugar nivel'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Certificate Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-500">
                  Recompensa final
                </div>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Certificado Simbólico de Aprendizaje
                </h3>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                  Completa los 5 niveles para desbloquear tu certificado descargable en HTML con tu puntuación final y las 5 insignias obtenidas.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  {completedCount}/5 insignias
                </span>
                <button
                  type="button"
                  disabled={!allCompleted}
                  onClick={() => setScreen('certificate')}
                  className="px-4 py-2 bg-[#059669] text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {allCompleted ? 'Abrir certificado' : 'Bloqueado'}
                </button>
              </div>
            </div>
          </section>

          {/* Badges Showcase */}
          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Vitrina de insignias ({progress.unlockedBadges.length}/5 desbloqueadas)
            </h3>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {QUEST_BADGES.map((badge) => {
                const unlocked = progress.unlockedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 rounded-xl border text-center ${
                      unlocked
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <Trophy
                      className={`w-7 h-7 mx-auto mb-2 ${
                        unlocked ? 'text-[#059669]' : 'text-slate-400'
                      }`}
                    />
                    <div className="text-xs font-semibold text-slate-900">
                      {badge.title}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {badge.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SCREEN: ACTIVE GAMEPLAY */}
      {screen === 'playing' && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-semibold text-[#0284C7]">
                Nivel {currentLevel} · Reto {roundIdx + 1} de{' '}
                {totalRoundsForLevel(currentLevel)}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">
                {currentLevel === 1 && 'Reconoce los resultados (TP, TN, FP, FN)'}
                {currentLevel === 2 && 'Construye la matriz de confusión'}
                {currentLevel === 3 && 'Detectives de errores por sector'}
                {currentLevel === 4 && 'Maestro de las métricas'}
                {currentLevel === 5 && 'Reto final: Auditoría de tu propio modelo'}
              </h3>
            </div>
            <div className="text-right font-mono tabular-nums text-xs text-slate-600">
              Puntos del nivel: <strong className="text-slate-900">{levelPoints} XP</strong>
            </div>
          </div>

          {/* LEVEL 1 */}
          {currentLevel === 1 && (() => {
            const r = LEVEL_1_ROUNDS[roundIdx];
            const options: Array<{ code: 'TP' | 'TN' | 'FP' | 'FN'; label: string }> = [
              { code: 'TP', label: 'Verdadero Positivo (TP)' },
              { code: 'TN', label: 'Verdadero Negativo (TN)' },
              { code: 'FP', label: 'Falso Positivo (FP)' },
              { code: 'FN', label: 'Falso Negativo (FN)' },
            ];
            return (
              <div className="mt-6 space-y-6">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-semibold text-slate-500">
                    Sector: {r.sector} · Positivo: {r.positiveLabel} · Negativo: {r.negativeLabel}
                  </div>
                  <p className="text-base font-medium text-slate-900">
                    {r.caseSummary}
                  </p>
                  <div className="flex flex-wrap gap-6 pt-2 text-xs text-slate-700">
                    <span>
                      Etiqueta real: <strong className="text-slate-900">{r.actual}</strong>
                    </span>
                    <span>
                      Predicción del modelo:{' '}
                      <strong className="text-[#0284C7]">{r.predicted}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {options.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() =>
                        handleAnswerResult(opt.code === r.answer, r.explanation)
                      }
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#0284C7] hover:bg-sky-50/40 text-left text-sm font-semibold text-slate-900 transition-colors cursor-pointer disabled:cursor-default"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* LEVEL 2 */}
          {currentLevel === 2 && (() => {
            const r = LEVEL_2_ROUNDS[roundIdx];
            return (
              <div className="mt-6 space-y-6">
                <p className="text-sm text-slate-600">
                  <strong>{r.title}</strong> · Cuenta cuántos casos corresponden a cada celda considerando{' '}
                  <strong>{r.positiveLabel}</strong> como clase positiva y{' '}
                  <strong>{r.negativeLabel}</strong> como negativa.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-6 overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Real</th>
                          <th className="py-2 px-3">Predicción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {r.pairs.map((pair) => (
                          <tr key={pair.id}>
                            <td className="py-1.5 px-3 font-mono tabular-nums text-slate-400">
                              {pair.id}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-900">
                              {pair.actual}
                            </td>
                            <td className="py-1.5 px-3 font-medium text-slate-700">
                              {pair.predicted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={submitLevel2Matrix} className="lg:col-span-6 space-y-4">
                    <div className="text-xs font-semibold text-slate-700">
                      Completa la matriz (Filas = Real · Columnas = Predicción):
                    </div>
                    <table className="w-full border-collapse text-xs text-center">
                      <thead>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            Real \ Pred.
                          </th>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            {r.positiveLabel}
                          </th>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            {r.negativeLabel}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50 text-left">
                            {r.positiveLabel}
                          </th>
                          <td className="p-2.5 border border-slate-200 bg-emerald-50/40">
                            <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                              TP
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              disabled={Boolean(feedback)}
                              value={l2Input.tp}
                              onChange={(e) =>
                                setL2Input((s) => ({ ...s, tp: e.target.value }))
                              }
                              className="w-16 px-2 py-1.5 text-center font-mono border border-slate-300 rounded bg-white"
                            />
                          </td>
                          <td className="p-2.5 border border-slate-200 bg-red-50/40">
                            <label className="block text-[11px] font-semibold text-red-800 mb-1">
                              FN
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              disabled={Boolean(feedback)}
                              value={l2Input.fn}
                              onChange={(e) =>
                                setL2Input((s) => ({ ...s, fn: e.target.value }))
                              }
                              className="w-16 px-2 py-1.5 text-center font-mono border border-slate-300 rounded bg-white"
                            />
                          </td>
                        </tr>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50 text-left">
                            {r.negativeLabel}
                          </th>
                          <td className="p-2.5 border border-slate-200 bg-amber-50/40">
                            <label className="block text-[11px] font-semibold text-amber-800 mb-1">
                              FP
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              disabled={Boolean(feedback)}
                              value={l2Input.fp}
                              onChange={(e) =>
                                setL2Input((s) => ({ ...s, fp: e.target.value }))
                              }
                              className="w-16 px-2 py-1.5 text-center font-mono border border-slate-300 rounded bg-white"
                            />
                          </td>
                          <td className="p-2.5 border border-slate-200 bg-emerald-50/40">
                            <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                              TN
                            </label>
                            <input
                              type="number"
                              min={0}
                              required
                              disabled={Boolean(feedback)}
                              value={l2Input.tn}
                              onChange={(e) =>
                                setL2Input((s) => ({ ...s, tn: e.target.value }))
                              }
                              className="w-16 px-2 py-1.5 text-center font-mono border border-slate-300 rounded bg-white"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {!feedback && (
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Comprobar matriz
                      </button>
                    )}
                  </form>
                </div>
              </div>
            );
          })()}

          {/* LEVEL 3 */}
          {currentLevel === 3 && (() => {
            const r = LEVEL_3_ROUNDS[roundIdx];
            return (
              <div className="mt-6 space-y-5">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-xs font-semibold text-[#0284C7]">
                    Sector: {r.sector}
                  </div>
                  <p className="text-sm text-slate-700">{r.scenario}</p>
                  <p className="text-base font-semibold text-slate-900 pt-1">
                    {r.question}
                  </p>
                </div>

                <div className="space-y-2.5">
                  {r.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() =>
                        handleAnswerResult(idx === r.correctIndex, r.explanation)
                      }
                      className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#0284C7] hover:bg-sky-50/40 text-left text-sm text-slate-800 transition-colors cursor-pointer disabled:cursor-default"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* LEVEL 4 */}
          {currentLevel === 4 && (() => {
            const r = LEVEL_4_ROUNDS[roundIdx];
            return (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-6">
                    <div className="text-xs font-semibold text-slate-500 mb-2">
                      {r.context}
                    </div>
                    <table className="w-full border-collapse text-xs text-center">
                      <thead>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            Real \ Pred.
                          </th>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            Positivo
                          </th>
                          <th className="p-2 border border-slate-200 bg-slate-50">
                            Negativo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50 text-left">
                            Positivo
                          </th>
                          <td className="p-3 border border-slate-200 bg-emerald-50 font-mono tabular-nums font-bold text-base">
                            TP = {r.tp}
                          </td>
                          <td className="p-3 border border-slate-200 bg-red-50 font-mono tabular-nums font-bold text-base">
                            FN = {r.fn}
                          </td>
                        </tr>
                        <tr>
                          <th className="p-2 border border-slate-200 bg-slate-50 text-left">
                            Negativo
                          </th>
                          <td className="p-3 border border-slate-200 bg-amber-50 font-mono tabular-nums font-bold text-base">
                            FP = {r.fp}
                          </td>
                          <td className="p-3 border border-slate-200 bg-emerald-50 font-mono tabular-nums font-bold text-base">
                            TN = {r.tn}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="md:col-span-6 space-y-3">
                    <div className="text-xs font-semibold text-[#0284C7]">
                      Calcula la métrica solicitada
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">
                      ¿Cuál es el valor de {r.targetMetric}?
                    </h4>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700">
                      Fórmula: {r.formulaHint}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {r.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() =>
                        handleAnswerResult(idx === r.correctIndex, r.explanation)
                      }
                      className="py-3.5 px-4 rounded-xl border border-slate-200 hover:border-[#0284C7] hover:bg-sky-50/40 font-mono tabular-nums text-base font-bold text-slate-900 transition-colors cursor-pointer disabled:cursor-default"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* LEVEL 5: DYNAMIC USER MODEL CHALLENGE */}
          {currentLevel === 5 && (() => {
            const q = level5Questions[roundIdx];
            const m = trainedModel.metrics;
            return (
              <div className="mt-6 space-y-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Dataset activo</span>
                    <strong className="text-slate-900">{trainedModel.datasetName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Algoritmo</span>
                    <strong className="text-slate-900">{trainedModel.algorithmName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Accuracy</span>
                    <strong className="font-mono tabular-nums text-slate-900">
                      {(m.macroAccuracy * 100).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">F1-Score</span>
                    <strong className="font-mono tabular-nums text-slate-900">
                      {((m.binary ? m.binary.f1 : m.macroF1) * 100).toFixed(1)}%
                    </strong>
                  </div>
                </div>

                <p className="text-base font-semibold text-slate-900">{q.prompt}</p>

                {roundIdx === level5Questions.length - 1 && (
                  <div>
                    <label
                      htmlFor="l5-note"
                      className="block text-xs font-medium text-slate-600 mb-1.5"
                    >
                      Justificación breve (opcional): ¿qué recomendación darías en este sector?
                    </label>
                    <input
                      id="l5-note"
                      type="text"
                      value={l5SuitabilityNote}
                      onChange={(e) => setL5SuitabilityNote(e.target.value)}
                      placeholder="Ej. Ajustar umbral para reducir Falsos Negativos..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                )}

                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() =>
                        handleAnswerResult(idx === q.correctIdx, q.explanation)
                      }
                      className="w-full p-4 rounded-xl border border-slate-200 hover:border-[#0284C7] hover:bg-sky-50/40 text-left text-sm text-slate-800 transition-colors cursor-pointer disabled:cursor-default"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Immediate Feedback Banner */}
          {feedback && lives > 0 && (
            <div
              className={`mt-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                feedback.correct
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="flex items-start gap-2.5 text-xs leading-relaxed">
                {feedback.correct ? (
                  <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={handleNextRound}
                className="px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {roundIdx + 1 >= totalRoundsForLevel(currentLevel)
                  ? 'Finalizar nivel'
                  : 'Siguiente reto'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SCREEN: LEVEL COMPLETE */}
      {screen === 'level_complete' && (
        <section className="bg-white border border-slate-200 rounded-xl p-8 max-w-xl mx-auto text-center space-y-5">
          <Trophy className="w-12 h-12 mx-auto text-[#059669]" />
          <h3 className="text-2xl font-bold text-slate-900">
            Nivel {currentLevel} completado
          </h3>
          <p className="text-sm text-slate-600">
            Has desbloqueado la insignia{' '}
            <strong className="text-slate-900">
              {QUEST_BADGES.find((b) => b.level === currentLevel)?.title}
            </strong>{' '}
            con {levelPoints} XP por respuestas + {lives * 25} XP de bonificación por vidas restantes.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setScreen('map')}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Mapa de niveles
            </button>
            {currentLevel < 5 ? (
              <button
                type="button"
                onClick={() => startLevel(currentLevel + 1)}
                className="px-5 py-2.5 bg-[#0284C7] hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Ir al Nivel {currentLevel + 1}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setScreen('certificate')}
                className="px-5 py-2.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Ver Certificado Simbólico
              </button>
            )}
          </div>
        </section>
      )}

      {/* SCREEN: GAME OVER */}
      {screen === 'game_over' && (
        <section className="bg-white border border-slate-200 rounded-xl p-8 max-w-xl mx-auto text-center space-y-5">
          <ShieldAlert className="w-12 h-12 mx-auto text-[#DC2626]" />
          <h3 className="text-2xl font-bold text-slate-900">
            Sin vidas restantes en este intento
          </h3>
          <p className="text-sm text-slate-600">
            Cada error es una oportunidad para afinar tu intuición sobre matrices de confusión. Puedes reintentar el nivel inmediatamente.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setScreen('map')}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
            >
              Volver al mapa
            </button>
            <button
              type="button"
              onClick={() => startLevel(currentLevel)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reintentar Nivel {currentLevel}
            </button>
          </div>
        </section>
      )}

      {/* SCREEN: SYMBOLIC CERTIFICATE */}
      {screen === 'certificate' && (
        <section className="bg-white border-2 border-[#0F172A] rounded-xl p-8 md:p-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border border-slate-200 bg-[#F8FAFC] flex items-center justify-center">
            <img
              src={CERTIFICATE_SEAL_PATH}
              alt="Sello académico de Confusion Matrix Quest"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[#0284C7] tracking-wider uppercase">
              Certificado Simbólico de Aprendizaje
            </div>
            <h3 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">
              CONFUSION MATRIX QUEST
            </h3>
          </div>

          <div className="max-w-sm mx-auto">
            <label
              htmlFor="player-name-cert"
              className="block text-xs text-slate-500 mb-1"
            >
              Nombre para el certificado
            </label>
            <input
              id="player-name-cert"
              type="text"
              value={progress.playerName}
              onChange={(e) =>
                onUpdateProgress((p) => ({ ...p, playerName: e.target.value }))
              }
              className="w-full px-3 py-2 text-center text-base font-semibold border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Reconocimiento otorgado por completar los 5 niveles de entrenamiento en clasificación supervisada, interpretación de matrices de confusión, análisis de impacto sectorial y cálculo de métricas estadísticas.
          </p>

          <div className="flex flex-wrap justify-center gap-2.5">
            {QUEST_BADGES.map((b) => (
              <div
                key={b.id}
                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800"
              >
                Nivel {b.level}: {b.title}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <span>
              Puntuación final: <strong className="text-slate-900 font-mono tabular-nums">{progress.xp} XP</strong>
            </span>
            <button
              type="button"
              onClick={() => downloadCertificateHtml(progress, QUEST_BADGES)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              Descargar Certificado HTML
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
