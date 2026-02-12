# CLOCKLN - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS global de controle de ponto corporativo (CLOCKLN) - plataforma inteligente Web App + Mobile, moderna, segura, escalável e preparada para uso internacional.

## User Personas
1. **Funcionário**: Registra entrada/saída via QR Code, visualiza horas trabalhadas, banco de horas
2. **RH/Admin**: Gerencia funcionários, visualiza relatórios, configura empresa, acessa Totem
3. **Gerente**: Visualiza equipe, aprova horas extras (Fase 2)

## Core Requirements (Static)
- Registro de ponto via QR Code dinâmico
- Modo Totem para tablets/terminais
- Dashboard funcionário e RH
- Suporte a 17 idiomas (incluindo RTL)
- Multi-tenant (isolamento por empresa)
- Tema escuro
- Autenticação JWT + PIN

---

## What's Been Implemented

### Phase 1 - MVP (Feb 12, 2026)

#### Backend (FastAPI)
- [x] Autenticação JWT (login/registro)
- [x] Login por PIN
- [x] CRUD de usuários
- [x] Geração de QR Code dinâmico (30s expiration)
- [x] Clock-in/Clock-out via QR scan
- [x] Dashboard Employee API
- [x] Dashboard HR API
- [x] Histórico de registros
- [x] Configurações de idioma/PIN
- [x] Multi-tenant por company_id

#### Frontend (React)
- [x] Login Page (split layout)
- [x] Registro de empresa
- [x] HR Dashboard (stats, lista de funcionários)
- [x] Employee Dashboard (status, horas, histórico)
- [x] Totem Mode (QR Code fullscreen, timer)
- [x] Scanner Page (camera QR reader)
- [x] History Page
- [x] Settings Page (idioma, PIN)
- [x] Language Selector (17 idiomas)
- [x] RTL Support (ar, he)
- [x] Responsive Design (mobile/tablet/desktop)

#### Idiomas Implementados
English, Português (BR), Português (PT), Deutsch, Español, Français, Italiano, Nederlands, Polski, Svenska, 简体中文, 繁體中文, 日本語, 한국어, हिन्दी, العربية, עברית

---

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Notificações internas
- [ ] Sistema de documentos (atestados)

### P1 - High Priority
- [ ] Gestão de contratos de trabalho
- [ ] Cálculo automático de faltas/atrasos
- [ ] Perfil de gerente com permissões específicas
- [ ] Aprovação de horas extras

### P2 - Medium Priority
- [ ] Sistema de assinaturas (SaaS tiers)
- [ ] Integração com email (SendGrid/Resend)
- [ ] PWA (Service Worker)
- [ ] Notificações push

### P3 - Low Priority
- [ ] Biometria/Face ID
- [ ] Integração calendário
- [ ] API pública
- [ ] White-label

---

## Technical Architecture

### Backend
- **Framework**: FastAPI
- **Database**: MongoDB
- **Auth**: JWT + bcrypt
- **QR**: Dynamic codes with 30s TTL

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS + Shadcn/UI
- **State**: React Context
- **i18n**: Custom solution (17 languages)
- **Animation**: Framer Motion

### Collections (MongoDB)
- companies
- users
- clock_records
- qr_codes

---

## Next Tasks
1. Implementar exportação PDF/Excel (Phase 2)
2. Adicionar sistema de notificações internas
3. Sistema de upload de documentos
4. Melhorar UX do scanner com feedback visual
