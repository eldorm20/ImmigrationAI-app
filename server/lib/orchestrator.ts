import { logger } from "./logger";
import { AIAgentsManager, AgentResponse } from "./agents";

export interface OrchestrationPlan {
    intent: string;
    targetAgent: string;
    priority: "low" | "medium" | "high";
    steps: string[];
}

export class AgentOrchestrator {
    private agentsManager: AIAgentsManager;

    constructor(agentsManager: AIAgentsManager) {
        this.agentsManager = agentsManager;
    }

    /**
     * Analyze user query and create an execution plan
     */
    async plan(query: string, context?: any): Promise<OrchestrationPlan> {
        try {
            // In a real Dify-like setup, this would be a specialized LLM call
            // For now, we use light-weight intent classification
            const lowerQuery = query.toLowerCase();

            let intent = "general-query";
            let targetAgent = "immigration-law";
            let priority: "low" | "medium" | "high" = "medium";
            let steps: string[] = ["analyze-query"];

            if (lowerQuery.includes("payment") || lowerQuery.includes("invoice") || lowerQuery.includes("refund")) {
                intent = "billing-support";
                targetAgent = "customer-service";
                priority = "high";
            } else if (lowerQuery.includes("document") || lowerQuery.includes("upload") || lowerQuery.includes("scan")) {
                intent = "document-help";
                targetAgent = "document-analysis";
            } else if (lowerQuery.includes("visa") || lowerQuery.includes("permit") || lowerQuery.includes("law")) {
                intent = "legal-advice";
                targetAgent = "immigration-law";
                steps.push("search-rag", "synthesize-legal-answer");
            }

            return { intent, targetAgent, priority, steps };
        } catch (error) {
            logger.error({ error, query }, "Orchestration planning failed");
            return {
                intent: "fallback",
                targetAgent: "customer-service",
                priority: "medium",
                steps: ["provide-standard-help"]
            };
        }
    }

    /**
     * Execute the plan by routing to the appropriate agent
     */
    async execute(query: string, context?: any): Promise<AgentResponse> {
        const orchestrationPlan = await this.plan(query, context);
        logger.info({ plan: orchestrationPlan }, "Executing orchestration plan");

        const agent = this.agentsManager.getAgent(orchestrationPlan.targetAgent);
        if (!agent) {
            return {
                success: false,
                error: `Orchestrator failed: Target agent ${orchestrationPlan.targetAgent} not found`,
            };
        }

        // Add orchestration metadata to context
        const enhancedContext = {
            ...context,
            orchestration: orchestrationPlan
        };

        // If it's a complex legal query, use the iterative reasoning specialist method
        if (orchestrationPlan.intent === "legal-advice" && (agent as any).developCaseStrategy) {
            return await (agent as any).developCaseStrategy(query, enhancedContext);
        }

        // Default to generic processing
        return await agent.process(query, enhancedContext);
    }
}
