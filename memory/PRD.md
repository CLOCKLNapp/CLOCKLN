# CLOCKLN - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS global de controle de ponto corporativo (CLOCKLN) - plataforma inteligente Web App + Mobile, moderna, segura, escalável e preparada para uso internacional. Registro de ponto via QR Code em totens/tablets.

## User Personas
1. **Funcionário**: Registra entrada/saída via QR Code, visualiza horas, férias, faltas
2. **RH/Admin**: Gerencia funcionários, aprova férias/documentos, configura totem
3. **Gerente**: Visualiza equipe, aprova horas extras (futuro)

## Core Requirements (Static)
- Registro de ponto via QR Code dinâmico (30s)
- Modo Totem para tablets/terminais (100% web-based)
- Dashboard funcionário e RH
- Sistema de férias e faltas
- Suporte a 17 idiomas (incluindo RTL)
- Multi-tenant (isolamento por empresa)
- Tema escuro

---

## What's Been Implemented

### Phase 1 - MVP (Feb 12, 2026)
- [x] Autenticação JWT + PIN
- [x] QR Code dinâmico
- [x] Clock-in/out via scan
- [x] Dashboards (Employee + HR)
- [x] 17 idiomas + RTL

### Phase 2 - Férias & Melhorias (Feb 13, 2026)

#### Backend v2.0.0
- [x] Sistema de férias (vacation_days_total, vacation_days_used)
- [x] Solicitação de férias (VacationRequest)
- [x] Sistema de faltas (Absence: absent, sick, vacation)
- [x] Eventos do Totem em tempo real (TotemClockEvent)
- [x] Relatórios de presença
- [x] Exportação CSV
- [x] Aprovação de férias pelo RH
- [x] Notificações internas

#### Frontend
- [x] Dashboard funcionário com férias/faltas
- [x] Página de solicitação de férias
- [x] Totem com sidebar de eventos recentes
- [x] Confirmação visual quando alguém bate ponto
- [x] Página de configuração do Totem
- [x] Instruções de instalação por dispositivo
- [x] Exportação CSV no HR Dashboard
- [x] Página de aprovação de férias para RH

---

## Como Instalar o Totem

### O CLOCKLN é 100% Web-Based
Não precisa instalar nenhum aplicativo! Funciona em qualquer dispositivo com navegador moderno.

### Dispositivos Compatíveis
- iPad (9.7" - 12.9") - iPadOS
- Android Tablet (8" - 13") - Android 8+
- Samsung Galaxy Tab (10.1" - 14.6")
- Microsoft Surface (10" - 15") - Windows
- Chromebook (11" - 15") - Chrome OS
- Qualquer computador/monitor com navegador

### Passo a Passo
1. **Conecte à internet** (Wi-Fi ou cabo)
2. **Abra o navegador** (Chrome, Safari, Firefox, Edge)
3. **Acesse a URL**: `https://seu-dominio.com/totem`
4. **Faça login** com credenciais de RH
5. **Ative tela cheia** (botão no canto superior direito)
6. **Pronto!** O QR Code atualiza automaticamente a cada 30 segundos

### Dicas por Dispositivo

**iPad/iPhone:**
- Safari → Compartilhar → "Adicionar à Tela de Início"
- Ative "Acesso Guiado" para travar o app

**Android:**
- Chrome → Menu (3 pontos) → "Adicionar à tela inicial"
- Use "Fixação de tela" nas configurações

**Totem/Kiosk Dedicado:**
- Configure modo kiosk no sistema
- Defina URL do totem como página inicial
- Configure inicialização automática

---

## Prioritized Backlog

### P0 - Critical (Concluído ✓)
- [x] Sistema de férias
- [x] Visualização de faltas
- [x] Confirmação visual no totem
- [x] Exportação CSV

### P1 - High Priority (Próximo)
- [ ] Upload de documentos (atestados)
- [ ] Notificações por email
- [ ] PWA (Service Worker)

### P2 - Medium Priority
- [ ] Planos SaaS (Free, Pro, Business)
- [ ] Relatórios PDF
- [ ] Aprovação de horas extras

### P3 - Low Priority
- [ ] Biometria/Face ID
- [ ] API pública
- [ ] White-label

---

## Technical Architecture

### Backend
- **Framework**: FastAPI v2.0.0
- **Database**: MongoDB
- **Auth**: JWT + bcrypt
- **QR**: Dynamic codes (30s TTL)

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS + Shadcn/UI
- **State**: React Context
- **i18n**: Custom (17 languages)
- **Animation**: Framer Motion

### Collections (MongoDB)
- companies, users, clock_records, qr_codes
- absences, vacation_requests, totem_events
- notifications, documents
