# CLOCKLN - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS global de controle de ponto corporativo (CLOCKLN) - plataforma inteligente para registro via QR Code em totens/tablets e geolocalização para funcionários remotos.

## User Personas
1. **Funcionário Presencial**: Bate ponto via QR Code no totem da empresa
2. **Funcionário Remoto**: Bate ponto via geolocalização de casa
3. **Funcionário Híbrido**: Pode usar ambos os métodos
4. **RH/Admin**: Gerencia funcionários, define modo de trabalho, configura totem

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
- **HR Admin**: admin@techcorp.com / admin123
- **Presencial**: joao@techcorp.com / joao123
- **Remoto**: carlos@techcorp.com / carlos123 (SP: -23.5505, -46.6333, 200m)

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

### P1 - High Priority (Próximo)
- [ ] Notificações por email (SendGrid)
- [ ] PWA para funcionamento offline
- [ ] Relatórios PDF detalhados
- [ ] Histórico de localizações de ponto remoto

### P2 - Medium Priority
- [ ] Planos SaaS (Free/Pro/Business)
- [ ] Dashboard gerente
- [ ] Aprovação de horas extras

### P3 - Low Priority
- [ ] API pública REST
- [ ] White-label
- [ ] Integração com folha de pagamento

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
