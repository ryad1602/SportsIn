// ============================================================
// API Metrics Service
// Trace l'utilisation de l'API Google Places.
// Fournit métriques sur les appels, erreurs, distribution des types.
// ============================================================
package org.SportsIn.services;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class APIMetricsService {

    private static class DailyMetrics {
        AtomicInteger googlePlacesCallsTotal = new AtomicInteger(0);
        AtomicInteger googlePlacesSuccesses  = new AtomicInteger(0);
        AtomicInteger googlePlacesErrors     = new AtomicInteger(0);
        AtomicInteger googlePlacesNeutre     = new AtomicInteger(0);
        Map<String, Integer> terrainDistribution = new ConcurrentHashMap<>();
        Map<String, Double>  confidenceScores    = new ConcurrentHashMap<>();
    }

    private final ConcurrentHashMap<LocalDate, DailyMetrics> dailyMetrics = new ConcurrentHashMap<>();

    private DailyMetrics getTodayMetrics() {
        return dailyMetrics.computeIfAbsent(LocalDate.now(), k -> new DailyMetrics());
    }

    // --- Google Places Tracking ---

    public void trackGooglePlacesCall(String resultType, double confidence) {
        DailyMetrics metrics = getTodayMetrics();
        metrics.googlePlacesCallsTotal.incrementAndGet();

        if ("ERROR".equals(resultType)) {
            metrics.googlePlacesErrors.incrementAndGet();
        } else {
            metrics.googlePlacesSuccesses.incrementAndGet();
            if ("NEUTRE".equals(resultType)) {
                metrics.googlePlacesNeutre.incrementAndGet();
            } else {
                metrics.terrainDistribution.merge(resultType, 1, Integer::sum);
                metrics.confidenceScores.put(resultType, confidence);
            }
        }
    }

    // --- Reporting ---

    public Map<String, Object> getMetricsReport() {
        DailyMetrics metrics = getTodayMetrics();
        int totalCalls = metrics.googlePlacesCallsTotal.get();

        Map<String, Object> googleStats = new HashMap<>();
        googleStats.put("callsToday",       totalCalls);
        googleStats.put("successesPercent", totalCalls > 0
                ? (metrics.googlePlacesSuccesses.get() * 100.0 / totalCalls) : 0);
        googleStats.put("errorsCount",      metrics.googlePlacesErrors.get());
        googleStats.put("neutreCounts",     metrics.googlePlacesNeutre.get());
        googleStats.put("averageConfidence", metrics.confidenceScores.values().stream()
                .mapToDouble(Double::doubleValue).average().orElse(0.0));
        googleStats.put("terrainDistribution", metrics.terrainDistribution);

        Map<String, Object> fairness = new HashMap<>();
        fairness.put("terrainDistribution",    metrics.terrainDistribution);
        fairness.put("averageConfidenceScore", metrics.confidenceScores.values().stream()
                .mapToDouble(Double::doubleValue).average().orElse(0.0));

        Map<String, Object> report = new HashMap<>();
        report.put("googlePlaces",    googleStats);
        report.put("fairnessMetrics", fairness);
        report.put("timestamp",       System.currentTimeMillis());
        return report;
    }
}
