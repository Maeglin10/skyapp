-- Migration: ajouter SKYMODEL à l'enum AiProvider
ALTER TYPE "LLMProvider" ADD VALUE IF NOT EXISTS 'SKYMODEL';
