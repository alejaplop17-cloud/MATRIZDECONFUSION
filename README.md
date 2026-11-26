# CONFUSION MATRIX QUEST – Aprende jugando con Machine Learning

Aplicación web educativa e interactiva para cargar conjuntos de datos tabulares, entrenar modelos de clasificación supervisada sin filtración de datos (data leakage), explorar matrices de confusión binarias y multiclase, dominar sus métricas jugando y descargar reportes HTML autónomos.

## Módulos incluidos

1. **Datos (`DataExplorerModule`)**: Carga local de archivos `.csv`, `.txt`, `.xls` y `.xlsx`, vista previa de las primeras 5 filas, diagnóstico automático (registros, columnas, numéricas/categóricas, valores faltantes, candidatas a Target y detección binaria/multiclase), además de 4 bases de demostración descargables (Salud, Finanzas, Marketing e Industria Multiclase).
2. **Modelo (`ModelTrainingModule`)**: Entrenamiento local en navegador con Regresión Logística, Árbol de Decisión (CART), Random Forest, K-Nearest Neighbors (KNN) y Naive Bayes Gaussiano, partición estratificada configurable y preprocesamiento ajustado exclusivamente sobre entrenamiento.
3. **Laboratorio (`ConfusionMatrixLab`)**: Matriz interactiva con inspección de registros por celda (TP, TN, FP, FN o cruces multiclase), ajuste en vivo del umbral de decisión y guía de 7 métricas (Accuracy, Precision, Recall, Especificidad, F1-Score, FPR y FNR) con fórmulas y ejemplos aplicados al dataset cargado.
4. **Videojuego y Recompensas (`QuestGameModule`)**: 5 niveles progresivos (incluyendo auditoría del modelo entrenado por el usuario en el Nivel 5), sistema de XP, vidas, insignias, barra de progreso, retroalimentación inmediata y certificado simbólico descargable en HTML.
5. **Resultados y Exportación (`DashboardModule`)**: KPIs, gráficos SVG comparativos entre los 5 algoritmos, distribución real vs. predicha, conclusiones automáticas y descarga de reporte HTML interactivo autónomo y archivos CSV.

## Instalación y ejecución local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` en tu navegador. Para generar el compilado de producción:

```bash
npm run build
```
