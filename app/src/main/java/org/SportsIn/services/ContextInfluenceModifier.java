package org.SportsIn.services;

import org.springframework.stereotype.Component;

/**
 * Modificateur d'influence contextuel (Géo + Temporel + Aura + Affinité + Mastery).
 * S'insère dans {@link InfluenceCalculator} après RouteInfluenceModifier (10) et PerkInfluenceModifier (20).
 */
@Component
public class ContextInfluenceModifier implements InfluenceModifier {

    private final ContextService contextService;

    public ContextInfluenceModifier(ContextService contextService) {
        this.contextService = contextService;
    }

    @Override
    public double apply(Long teamId, String pointId, double currentModifier) {
        return currentModifier + contextService.computeContextModifier(teamId, pointId);
    }

    @Override
    public int getOrder() {
        return 30;
    }
}
