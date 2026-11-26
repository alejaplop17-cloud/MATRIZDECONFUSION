import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { AppTab } from '../types/ml';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: AppTab) => void;
}

const TOUR_STEPS: Array<{
  step: number;
  tab: AppTab;
  title: string;
  summary: string;
  actionLabel: string;
  highlights: string[];
}> = [
  {
    step: 1,
    tab: 'datos',
    title: '01. Carga y exploración automática de datos',
    summary:
      'Sube cualquier archivo CSV, TXT, XLS o XLSX o elige una de las 4 bases de demostración (Salud, Finanzas, Marketing o Industria Multiclase). El sistema detecta tipos, valores faltantes y candidatas a variable objetivo.',
    actionLabel: 'Ir a Datos',
    highlights: [
      'Vista previa de las primeras 5 filas',
      'Detección automática binaria o multiclase',
      'Selección manual de Target y Predictoras',
    ],
  },
  {
    step: 2,
    tab: 'modelo',
    title: '02. Preparación sin filtración de datos y entrenamiento',
    summary:
      'Elige entre Regresión Logística, Árbol de Decisión, Random Forest, KNN o Naive Bayes. Configura la partición entrenamiento/prueba y ejecuta el pipeline seguro.',
    actionLabel: 'Ir a Modelo',
    highlights: [
      'Imputación y estandarización ajustadas solo en entrenamiento',
      'Codificación One-Hot automática de variables categóricas',
      'Opción de comparar los 5 algoritmos simultáneamente',
    ],
  },
  {
    step: 3,
    tab: 'laboratorio',
    title: '03. Laboratorio interactivo de Matrices de Confusión',
    summary:
      'Haz clic sobre cualquier celda (TP, TN, FP, FN o cruces multiclase) para inspeccionar casos reales, ajusta el umbral de decisión en vivo y estudia las 7 métricas con fórmulas y ejemplos de tu propio dataset.',
    actionLabel: 'Ir a Laboratorio',
    highlights: [
      'Accuracy, Precision, Recall, Especificidad, F1, FPR y FNR',
      'Slider de umbral con actualización instantánea',
      'Desglose One-vs-Rest para matrices multiclase',
    ],
  },
  {
    step: 4,
    tab: 'videojuego',
    title: '04. Videojuego educativo en 5 niveles',
    summary:
      'Pon a prueba lo aprendido ganando XP, cuidando tus 3 vidas y desbloqueando insignias hasta auditar tu propio modelo entrenado en el Nivel 5 y obtener tu Certificado Simbólico.',
    actionLabel: 'Ir a Videojuego',
    highlights: [
      'Nivel 1: Reconoce TP, TN, FP y FN',
      'Nivel 2: Construye la matriz desde registros',
      'Nivel 3: Detectives de errores en 6 sectores económicos',
      'Nivel 4 y 5: Cálculo de métricas y auditoría de tu modelo',
    ],
  },
  {
    step: 5,
    tab: 'resultados',
    title: '05. Dashboard ejecutivo y descarga en HTML autónomo',
    summary:
      'Visualiza gráficos comparativos, distribución real vs. predicha, conclusiones automáticas y descarga un reporte HTML interactivo que funciona sin conexión en cualquier navegador.',
    actionLabel: 'Ir a Resultados',
    highlights: [
      'Reporte HTML interactivo independiente',
      'Exportación CSV de matriz, métricas y predicciones',
      'Comparativa completa entre los 5 algoritmos',
    ],
  },
];

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [stepIdx, setStepIdx] = useState(0);

  if (!isOpen) return null;
  const current = TOUR_STEPS[stepIdx];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recorrido de demostración"
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-[#0284C7]">
              Recorrido de demostración · Paso {current.step} de {TOUR_STEPS.length}
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar recorrido"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{current.summary}</p>

        <ul className="space-y-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
          {current.highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setStepIdx(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono tabular-nums cursor-pointer ${
                  idx === stepIdx
                    ? 'bg-[#0F172A] text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.step}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onNavigateTab(current.tab);
                onClose();
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              {current.actionLabel}
            </button>
            {stepIdx < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => i + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0284C7] hover:bg-sky-700 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                Siguiente
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#059669] hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
              >
                Finalizar recorrido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
