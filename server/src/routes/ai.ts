// AI API Routes - Express endpoints for AI services
import { Router } from 'express';
import { aiDocumentGenerator } from '../ai/services/documentGenerator';
import { aiInterviewCoach } from '../ai/services/interviewCoach';
import { aiCaseAnalyzer } from '../ai/services/caseAnalyzer';
import { legalSourcesRAG } from '../ai/services/legalSourcesRAG';
import { ollamaClient } from '../ai/ollama/client';

const router = Router();

// Document Generation
router.post('/ai/documents/generate', async (req, res) => {
    try {
        const { documentType, data, language = 'en' } = req.body;

        const document = await aiDocumentGenerator.generateDocument(
            documentType,
            data,
            language
        );

        res.json({ success: true, document });
    } catch (error) {
        console.error('Document generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate document' });
    }
});

// Document Generation - Streaming
router.post('/ai/documents/generate-stream', async (req, res) => {
    try {
        const { documentType, data, language = 'en' } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        for await (const chunk of aiDocumentGenerator.generateDocumentStream(documentType, data, language)) {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Stream generation error:', error);
        res.status(500).json({ error: 'Failed to stream document' });
    }
});

// Document Review
router.post('/ai/documents/review', async (req, res) => {
    try {
        const { content, documentType } = req.body;

        const review = await aiDocumentGenerator.reviewDocument(content, documentType);

        res.json({ success: true, review });
    } catch (error) {
        console.error('Document review error:', error);
        res.status(500).json({ error: 'Failed to review document' });
    }
});

// Interview Questions Generation
router.post('/ai/interview/questions', async (req, res) => {
    try {
        const { visaType, targetCountry, count = 10 } = req.body;

        const questions = await aiInterviewCoach.generateQuestions(
            visaType,
            targetCountry,
            count
        );

        res.json({ success: true, questions });
    } catch (error) {
        console.error('Question generation error:', error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

// Interview Answer Evaluation
router.post('/ai/interview/evaluate', async (req, res) => {
    try {
        const { question, answer, expectedPoints = [] } = req.body;

        const evaluation = await aiInterviewCoach.evaluateAnswer(
            question,
            answer,
            expectedPoints
        );

        res.json({ success: true, evaluation });
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({ error: 'Failed to evaluate answer' });
    }
});

// Case Analysis
router.post('/ai/case/analyze', async (req, res) => {
    try {
        const { profile } = req.body;

        const analysis = await aiCaseAnalyzer.analyzeCase(profile);

        res.json({ success: true, analysis });
    } catch (error) {
        console.error('Case analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze case' });
    }
});

// Visa Requirements
router.get('/ai/visa/requirements', async (req, res) => {
    try {
        const { visaType, targetCountry } = req.query;

        const requirements = await aiCaseAnalyzer.getVisaRequirements(
            visaType as string,
            targetCountry as string
        );

        res.json({ success: true, requirements });
    } catch (error) {
        console.error('Requirements error:', error);
        res.status(500).json({ error: 'Failed to get requirements' });
    }
});

// Legal Chat with Citations
router.post('/ai/chat/legal', async (req, res) => {
    try {
        const { question, country } = req.body;

        const result = await legalSourcesRAG.queryWithCitations(question, country);

        res.json({
            success: true,
            answer: result.answer,
            citations: result.citations,
            confidence: result.confidence,
        });
    } catch (error) {
        console.error('Legal chat error:', error);
        res.status(500).json({ error: 'Failed to get legal answer' });
    }
});

// Available Models
router.get('/ai/models', async (req, res) => {
    try {
        const models = await ollamaClient.listModels();
        res.json({ success: true, models });
    } catch (error) {
        console.error('Models error:', error);
        res.status(500).json({ error: 'Failed to list models' });
    }
});

// Health Check
router.get('/health', async (req, res) => {
    try {
        const models = await ollamaClient.listModels();
        const isHealthy = models.length > 0;

        res.json({
            status: isHealthy ? 'healthy' : 'degraded',
            ai: {
                ollama: isHealthy,
                models: models.length,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: 'AI services unavailable',
        });
    }
});

export default router;
