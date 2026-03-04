# Changelog

## [0.2.0] - 2026-03-04

### Added
- Sistema completo de reservas de quadras de tenis
- Painel administrativo com estatisticas
- Gerenciamento de usuarios (ADMIN, COURT_ADMIN, PLAYER)
- Sistema de slots discretos por quadra (CourtSlot)
- Bloqueio de horarios por administradores
- Janela de reservas (quarta 20h ate domingo)
- Contador regressivo para abertura de reservas
- Badge de status: Aguardando Adversario / Confirmado

### Changed
- Migrado de SQLite para PostgreSQL (Supabase)
- Configurado para deploy na Vercel
- Otimizado pool de conexoes para serverless
