# CLOCKLN - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS global de controle de ponto corporativo (CLOCKLN) - plataforma inteligente para registro via QR Code em totens/tablets e geolocalização para funcionários remotos.

## User Personas
1. **Funcionário Presencial**: Bate ponto via QR Code no totem da empresa
2. **Funcionário Remoto**: Bate ponto via geolocalização de casa
3. **Funcionário Híbrido**: Pode usar ambos os métodos
4. **RH/Admin**: Gerencia funcionários, define modo de trabalho, configura totem
5. **Gerente**: Visualiza e gerencia apenas sua equipe atribuída

---

## What's Been Implemented

### Phase 1 - MVP Core ✅
- Autenticação JWT + PIN
- QR Code dinâmico (30s)
- Clock-in/out via scan
- Dashboards (Employee + HR)
- 17 idiomas + RTL

### Phase 2 - Férias & Melhorias ✅
- Sistema de férias completo
- Visualização de faltas/atestados
- Eventos do Totem em tempo real
- Exportação CSV

### Phase 3 - Documentos & Quiosque ✅
- Modo Quiosque (iPad, Android, Windows)
- Upload de documentos/atestados
- Notificações internas

### Phase 4 - Geolocalização para Remotos ✅

#### Backend
- [x] Campo `work_mode` no usuário (onsite/hybrid/remote)
- [x] Campo `home_location` (lat/lng) para localização cadastrada
- [x] Campo `location_radius_meters` para raio permitido
- [x] API `/clock/geolocation` com validação:
  - Verifica se usuário é remote/hybrid
  - Verifica se home_location está configurado
  - Calcula distância usando fórmula Haversine
  - Bloqueia se distância > raio permitido

#### Frontend
- [x] Página "Ponto Remoto" com:
  - Solicitação de permissão de GPS
  - Exibição da localização atual
  - Botão de clock-in/out
  - Feedback de distância
- [x] Menu "Remoto" aparece APENAS para funcionários remote/hybrid
- [x] Página de bloqueio para funcionários presenciais
- [x] HR pode criar funcionários com modo de trabalho e localização

### Phase 4.1 - Mapa de Ponto Remoto para HR ✅ (2026-02-13)

#### Backend
- [x] API `/reports/remote-workers` - Lista todos os funcionários remote/hybrid com localizações
- [x] API `/reports/remote-clocks?days=N` - Retorna registros de ponto com geolocalização
- [x] Cálculo de distância entre ponto e local cadastrado
- [x] Enriquecimento com nome do funcionário e status do dia

#### Frontend
- [x] Página `/remote-map` com mapa Leaflet (tema escuro)
- [x] Cards de estatísticas: Funcionários Remotos, Ponto Hoje, Registros no Período
- [x] Filtro de período (Hoje, 7 dias, 30 dias)
- [x] Marcadores no mapa:
  - Azul: Local cadastrado (home_location) com círculo de raio
  - Verde: Ponto dentro do raio permitido
  - Vermelho: Ponto fora do raio permitido
- [x] Lista de registros recentes com distância
- [x] Botão "Mapa Remotos" no dashboard HR

### Phase 5 - Notificações e Gerentes ✅ (2026-02-13)

#### Sistema de Notificações
- [x] API `/notifications` - CRUD completo de notificações
- [x] HR pode enviar para todos ou funcionário específico
- [x] 4 tipos: info, success, warning, error
- [x] Página `/send-notification` com formulário e histórico
- [x] Botão "Notificações" no dashboard HR

#### Alertas Automáticos de Localização
- [x] Quando funcionário bate ponto FORA do raio permitido:
  - Ponto é registrado normalmente
  - Alerta tipo "warning" é criado automaticamente
  - HR vê o alerta em `/notifications/alerts`
- [x] Registro inclui `outside_radius: true` e `distance_from_home`

#### Papel de Gerente
- [x] Novo role: `manager`
- [x] Campo `manager_id` nos usuários para atribuição
- [x] Dashboard exclusivo do gerente (`/dashboard`)
  - Mostra APENAS funcionários da sua equipe
  - Stats: Minha Equipe, Ponto Hoje, Horas Extras
- [x] APIs: `/dashboard/manager`, `/manager/team`, `/managers`
- [x] Campo "Gerente Responsável" ao adicionar funcionário

### Phase 6 - Planos SaaS e Relatórios ✅ (2026-02-13)

#### Planos SaaS com Stripe
- [x] 3 planos: Free ($0, 5 funcionários), Pro ($29, 50), Business ($99, 500)
- [x] Integração Stripe Checkout para pagamentos
- [x] Página `/subscription` com cards de planos e botões de upgrade
- [x] Polling de status de pagamento após checkout
- [x] Histórico de transações em `payment_transactions`
- [x] Campos no Company: `subscription_plan`, `subscription_status`, `max_employees`

#### Relatórios PDF e Excel
- [x] `/reports/attendance/pdf` - Relatório de ponto em PDF (reportlab)
- [x] `/reports/attendance/excel` - Relatório de ponto em Excel (xlsxwriter)
- [x] `/reports/employees/pdf` - Lista de funcionários em PDF
- [x] Página `/reports` com seleção de período e botões de download
- [x] Relatórios incluem: nome, data, entrada/saída, horas, método, fora do raio

### Phase 7 - Banco de Horas e Aprovação de Extras ✅ (2026-02-13)

#### Banco de Horas (Time Bank)
- [x] Modelo `TimeBank` com saldo por funcionário
- [x] Modelo `TimeBankTransaction` com histórico de movimentações
- [x] API `/timebank/balance` - Saldo do funcionário
- [x] API `/timebank/transactions` - Histórico de transações
- [x] API `/timebank/use` - Usar horas para compensação
- [x] API `/timebank/all` - Todos os saldos (HR only)
- [x] API `/timebank/{user_id}/adjust` - Ajuste manual (HR only)
- [x] Página `/timebank` com saldo, botão compensar e histórico
- [x] Card "Time Bank" no dashboard do funcionário com link

#### Aprovação de Horas Extras
- [x] Modelo `OvertimeRequest` com status pending/approved/rejected
- [x] Clock-out cria automaticamente solicitação quando overtime > 0
- [x] API `/overtime/pending` - Solicitações pendentes (HR/Gerente)
- [x] API `/overtime/history` - Histórico de solicitações
- [x] API `/overtime/{id}` PATCH - Aprovar/rejeitar
- [x] Aprovação adiciona horas ao banco do funcionário
- [x] Rejeição notifica funcionário com motivo
- [x] Página `/overtime-approvals` com tabs Pendentes/Histórico
- [x] Botão "Extras" no dashboard HR

---

## Modos de Trabalho

| Modo | QR Code (Totem) | Geolocalização |
|------|-----------------|----------------|
| **Presencial** | ✅ Obrigatório | ❌ Bloqueado |
| **Híbrido** | ✅ Permitido | ✅ Permitido |
| **Remoto** | ❌ Bloqueado | ✅ Obrigatório |

### Como Funciona o Ponto Remoto
1. RH cadastra funcionário como "Remoto" ou "Híbrido"
2. RH define coordenadas (lat/lng) do local de trabalho remoto
3. RH define raio permitido (default: 100m)
4. Funcionário abre página "Ponto Remoto" no celular
5. Clica em "Obter Localização" (GPS)
6. Se estiver dentro do raio → ponto registrado
7. Se estiver fora do raio → mensagem de erro com distância

---

## Credenciais de Teste
- **HR Admin (ACME)**: hr@acme.com / password123
- **Gerente (ACME)**: gerente@acme.com / password123
- **Remoto (ACME)**: carlos.remoto@acme.com / password123 (SP: -23.5505, -46.6333, 150m)

---

## Prioritized Backlog

### Concluído ✅
- [x] Sistema completo de ponto (QR + Geolocalização)
- [x] Modos de trabalho (onsite/hybrid/remote)
- [x] Sistema de férias e faltas
- [x] Upload de documentos
- [x] Modo Quiosque
- [x] 17 idiomas + RTL
- [x] Exportação CSV
- [x] **Mapa de Ponto Remoto para HR** (react-leaflet)
- [x] **Sistema de Notificações** (RH envia → Funcionários recebem)
- [x] **Alertas Automáticos** (ponto fora do raio → notifica HR)
- [x] **Papel "Gerente"** (dashboard próprio, visualiza apenas sua equipe)
- [x] **Planos SaaS** (Free/Pro/Business) com Stripe checkout
- [x] **Módulo de Relatórios** PDF e Excel detalhados
- [x] **Banco de Horas** (saldo, transações, compensação)
- [x] **Aprovação de Horas Extras** (HR/Gerente aprova, adiciona ao banco)
- [x] **PWA (Progressive Web App)** - Instalável em mobile e desktop
- [x] **Sistema de Email** (SendGrid) - Templates prontos para notificações

### P1 - High Priority (Opcional)
- [ ] Push Notifications (Web Push API)
- [ ] Biometria facial

### P2 - Medium Priority
- [ ] API pública REST
- [ ] White-label
- [ ] Integração com folha de pagamento

### P3 - Low Priority
- [ ] Biometria facial
- [ ] Integração com calendário (Google Calendar)
- [ ] Chatbot para dúvidas

---

## Technical Architecture

### Backend v2.0
- FastAPI + MongoDB
- JWT + bcrypt
- Haversine formula para distância
- Multi-tenant por company_id

### Frontend
- React 19 + Tailwind + Shadcn/UI
- Geolocation API (HTML5)
- Framer Motion animations
- 17 idiomas customizados

### Collections MongoDB
- companies, users, clock_records
- qr_codes, totem_events
- absences, vacation_requests
- documents, notifications

---

## Key Files Reference

### Backend
- `/app/backend/server.py` - Monólito FastAPI com todas as rotas e modelos

### Frontend Pages
- `/app/frontend/src/pages/LoginPage.js` - Login/Registro
- `/app/frontend/src/pages/HRDashboard.js` - Dashboard do RH
- `/app/frontend/src/pages/EmployeeDashboard.js` - Dashboard do funcionário
- `/app/frontend/src/pages/RemoteClockPage.js` - Ponto remoto via GPS
- `/app/frontend/src/pages/RemoteMapPage.js` - Mapa de pontos remotos (HR)
- `/app/frontend/src/pages/TotemPage.js` - Modo totem com QR Code
- `/app/frontend/src/pages/TotemSetupPage.js` - Configuração do Quiosque

### Frontend Components
- `/app/frontend/src/components/RemoteWorkersMap.js` - Componente Leaflet do mapa
- `/app/frontend/src/components/AppLayout.js` - Layout padrão
- `/app/frontend/src/context/AuthContext.js` - Contexto de autenticação
- `/app/frontend/src/context/LanguageContext.js` - i18n com 17 idiomas

### Tests
- `/app/backend/tests/test_remote_map.py` - Testes do mapa de ponto remoto
- `/app/test_reports/` - Relatórios de teste
