# CLOCKLN - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS global de controle de ponto corporativo (CLOCKLN) - plataforma inteligente Web App + Mobile para registro via QR Code em totens/tablets de qualquer modelo.

## User Personas
1. **Funcionário**: Bate ponto via QR, visualiza horas/férias/faltas, envia documentos
2. **RH/Admin**: Gerencia funcionários, aprova férias/documentos, configura totem
3. **Gerente**: Visualiza equipe (futuro)

---

## What's Been Implemented

### Phase 1 - MVP Core ✅
- Autenticação JWT + PIN
- QR Code dinâmico (30s)
- Clock-in/out via scan
- Dashboards (Employee + HR)
- 17 idiomas + RTL

### Phase 2 - Férias & Melhorias ✅
- Sistema de férias (solicitar/aprovar)
- Visualização de faltas/atestados
- Eventos do Totem em tempo real
- Exportação CSV

### Phase 3 - Documentos & Quiosque ✅

#### Modo Quiosque (NOVO)
- Instruções detalhadas para iPad (Acesso Guiado)
- Instruções para Android (Fixação de tela)
- Instruções para Windows/Chromebook
- Dicas de software de quiosque (Fully Kiosk, Kiosk Pro)
- Configurações de segurança e performance

#### Upload de Documentos (NOVO)
- Upload de atestados médicos (PDF, PNG, JPG)
- Upload de justificativas de falta
- Limite de 10MB por arquivo
- Status: pendente/aprovado/rejeitado
- Revisão pelo RH

#### Notificações Internas (NOVO)
- Notificações do RH para funcionários
- Tipos: info, warning, success, error
- Marcar como lido
- Contador de não lidas no dashboard

---

## Como Instalar o Totem (ATUALIZADO)

### Passo a Passo Básico
1. Conecte tablet à internet
2. Abra navegador (Chrome/Safari)
3. Acesse: `https://seu-dominio.com/totem`
4. Login com credenciais RH
5. Ative tela cheia

### Modo Quiosque - TRAVA O TABLET

**iPad (Acesso Guiado):**
1. Ajustes → Acessibilidade → Acesso Guiado → ATIVAR
2. Defina código PIN (só RH sabe)
3. Abra CLOCKLN no Safari
4. Clique 3x no botão lateral
5. Toque "Iniciar" - TABLET TRAVADO!

**Android (Fixação de Tela):**
1. Configurações → Segurança → Fixação de tela → ATIVAR
2. Ative "Solicitar PIN antes de desafixar"
3. Abra CLOCKLN no Chrome
4. Botão Apps Recentes → ícone Chrome → "Fixar"
5. TABLET TRAVADO!

**Windows/Chromebook:**
- Chrome: `--kiosk https://url-do-totem`
- Chromebook: Chrome Enterprise modo quiosque

---

## Credenciais de Teste
- **HR Admin**: admin@techcorp.com / admin123
- **Funcionário**: joao@techcorp.com / joao123

---

## Prioritized Backlog

### Concluído ✅
- [x] Sistema de férias completo
- [x] Sistema de faltas/atestados
- [x] Modo quiosque documentado
- [x] Upload de documentos
- [x] Notificações internas
- [x] Exportação CSV

### P1 - High Priority (Próximo)
- [ ] Notificações por email (SendGrid/Resend)
- [ ] PWA (Service Worker para offline)
- [ ] Relatórios PDF

### P2 - Medium Priority
- [ ] Planos SaaS (Free/Pro/Business)
- [ ] Aprovação de horas extras
- [ ] Dashboard gerente

### P3 - Low Priority
- [ ] API pública
- [ ] White-label
- [ ] Biometria

---

## Tech Stack
- **Backend**: FastAPI v2.0.0, MongoDB
- **Frontend**: React 19, Tailwind, Shadcn/UI
- **Auth**: JWT + bcrypt
- **i18n**: 17 idiomas, RTL support
